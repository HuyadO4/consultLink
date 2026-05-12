create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  description text not null check (char_length(trim(description)) >= 100),
  price integer not null check (price > 0),
  category text not null,
  location text not null check (char_length(trim(location)) >= 2),
  featured_image_url text,
  consultation_type text not null check (consultation_type in ('physical', 'virtual', 'both')),
  duration_minutes integer not null check (duration_minutes in (30, 60, 90, 120)),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  consultant_id uuid not null references public.profiles (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (start_time < end_time)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique,
  listing_id uuid not null references public.listings (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  consultant_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
before update on public.listings
for each row
execute function public.set_updated_at();

drop trigger if exists set_availability_slots_updated_at on public.availability_slots;
create trigger set_availability_slots_updated_at
before update on public.availability_slots
for each row
execute function public.set_updated_at();

create or replace function public.prevent_overlapping_availability_slots()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.availability_slots existing_slot
    where existing_slot.consultant_id = new.consultant_id
      and existing_slot.day_of_week = new.day_of_week
      and existing_slot.is_active = true
      and coalesce(new.is_active, true) = true
      and existing_slot.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and new.start_time < existing_slot.end_time
      and new.end_time > existing_slot.start_time
  ) then
    raise exception using
      errcode = '23505',
      message = 'This time overlaps with an existing slot on that day.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_overlapping_availability_slots on public.availability_slots;
create trigger prevent_overlapping_availability_slots
before insert or update on public.availability_slots
for each row
execute function public.prevent_overlapping_availability_slots();

alter table public.listings enable row level security;
alter table public.availability_slots enable row level security;
alter table public.reviews enable row level security;

grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;

grant select on public.availability_slots to anon, authenticated;
grant insert, update, delete on public.availability_slots to authenticated;

grant select on public.reviews to anon, authenticated;

drop policy if exists "listings_public_can_view_approved" on public.listings;
create policy "listings_public_can_view_approved"
on public.listings
for select
using (status = 'approved' or auth.uid() = consultant_id or public.is_admin());

drop policy if exists "consultants_can_insert_own_listings" on public.listings;
create policy "consultants_can_insert_own_listings"
on public.listings
for insert
with check (
  auth.uid() = consultant_id
  and public.current_user_role() = 'consultant'
);

drop policy if exists "consultants_can_update_own_listings" on public.listings;
create policy "consultants_can_update_own_listings"
on public.listings
for update
using (auth.uid() = consultant_id or public.is_admin())
with check (auth.uid() = consultant_id or public.is_admin());

drop policy if exists "consultants_can_delete_own_listings" on public.listings;
create policy "consultants_can_delete_own_listings"
on public.listings
for delete
using (auth.uid() = consultant_id or public.is_admin());

drop policy if exists "public_can_view_active_availability" on public.availability_slots;
create policy "public_can_view_active_availability"
on public.availability_slots
for select
using (is_active = true or auth.uid() = consultant_id or public.is_admin());

drop policy if exists "consultants_can_insert_own_availability" on public.availability_slots;
create policy "consultants_can_insert_own_availability"
on public.availability_slots
for insert
with check (
  auth.uid() = consultant_id
  and public.current_user_role() = 'consultant'
);

drop policy if exists "consultants_can_update_own_availability" on public.availability_slots;
create policy "consultants_can_update_own_availability"
on public.availability_slots
for update
using (auth.uid() = consultant_id or public.is_admin())
with check (auth.uid() = consultant_id or public.is_admin());

drop policy if exists "consultants_can_delete_own_availability" on public.availability_slots;
create policy "consultants_can_delete_own_availability"
on public.availability_slots
for delete
using (auth.uid() = consultant_id or public.is_admin());

drop policy if exists "reviews_are_publicly_visible" on public.reviews;
create policy "reviews_are_publicly_visible"
on public.reviews
for select
using (true);

create index if not exists listings_consultant_id_idx on public.listings (consultant_id);
create index if not exists listings_status_created_at_idx on public.listings (status, created_at desc);
create index if not exists listings_category_idx on public.listings (category);
create index if not exists availability_slots_consultant_day_idx on public.availability_slots (consultant_id, day_of_week, start_time);
create index if not exists reviews_listing_created_at_idx on public.reviews (listing_id, created_at desc);

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "listing_images_authenticated_insert" on storage.objects;
create policy "listing_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_images_authenticated_update" on storage.objects;
create policy "listing_images_authenticated_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing_images_authenticated_delete" on storage.objects;
create policy "listing_images_authenticated_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
