create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  consultant_id uuid not null references public.profiles (id) on delete cascade,
  scheduled_date date not null,
  start_time time not null,
  end_time time not null,
  consultation_type text not null check (consultation_type in ('physical', 'virtual')),
  status text not null default 'initiated' check (status in ('initiated', 'pending', 'approved', 'completed', 'rejected', 'expired', 'refunded')),
  payment_reference text unique,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  amount_paid integer,
  meet_link text,
  consultant_notes text,
  approval_deadline timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time),
  check (amount_paid is null or amount_paid >= 0)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null check (type in ('booking_created', 'booking_approved', 'booking_rejected', 'payment_success', 'payment_refunded', 'session_reminder')),
  related_booking_id uuid references public.bookings (id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.reviews
  drop constraint if exists reviews_booking_id_fkey;

alter table public.reviews
  add constraint reviews_booking_id_fkey
  foreign key (booking_id)
  references public.bookings (id)
  on delete cascade;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
before update on public.bookings
for each row
execute function public.set_updated_at();

create or replace function public.prevent_overlapping_confirmed_or_pending_bookings()
returns trigger
language plpgsql
as $$
begin
  if new.status not in ('pending', 'approved') then
    return new;
  end if;

  if exists (
    select 1
    from public.bookings existing_booking
    where existing_booking.consultant_id = new.consultant_id
      and existing_booking.scheduled_date = new.scheduled_date
      and existing_booking.status in ('pending', 'approved')
      and existing_booking.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and new.start_time < existing_booking.end_time
      and new.end_time > existing_booking.start_time
  ) then
    raise exception using
      errcode = '23505',
      message = 'This time slot is no longer available. Please choose another.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_overlapping_confirmed_or_pending_bookings on public.bookings;
create trigger prevent_overlapping_confirmed_or_pending_bookings
before insert or update on public.bookings
for each row
execute function public.prevent_overlapping_confirmed_or_pending_bookings();

alter table public.bookings enable row level security;
alter table public.notifications enable row level security;

grant select on public.bookings to authenticated;
grant select on public.notifications to authenticated;
grant update (is_read) on public.notifications to authenticated;

drop policy if exists "users_can_view_related_bookings" on public.bookings;
create policy "users_can_view_related_bookings"
on public.bookings
for select
using (
  auth.uid() = customer_id
  or auth.uid() = consultant_id
  or public.is_admin()
);

drop policy if exists "users_can_view_own_notifications" on public.notifications;
create policy "users_can_view_own_notifications"
on public.notifications
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "users_can_mark_own_notifications_as_read" on public.notifications;
create policy "users_can_mark_own_notifications_as_read"
on public.notifications
for update
using (auth.uid() = user_id or public.is_admin())
with check (auth.uid() = user_id or public.is_admin());

create index if not exists bookings_customer_id_idx on public.bookings (customer_id);
create index if not exists bookings_consultant_id_idx on public.bookings (consultant_id);
create index if not exists bookings_consultant_schedule_idx on public.bookings (consultant_id, scheduled_date, start_time);
create index if not exists bookings_status_idx on public.bookings (status);
create unique index if not exists bookings_payment_reference_idx on public.bookings (payment_reference) where payment_reference is not null;
create index if not exists notifications_user_unread_idx on public.notifications (user_id, is_read, created_at desc);
