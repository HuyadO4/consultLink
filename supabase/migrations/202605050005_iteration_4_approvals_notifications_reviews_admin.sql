alter table public.bookings
  add column if not exists rejection_reason text,
  add column if not exists meeting_link_status text not null default 'not_required'
    check (meeting_link_status in ('not_required', 'pending_generation', 'manual_required', 'available'));

update public.bookings
set meeting_link_status = case
  when consultation_type = 'virtual' and meet_link is not null then 'available'
  when consultation_type = 'virtual' and meet_link is null then 'manual_required'
  else 'not_required'
end
where meeting_link_status is null
   or meeting_link_status = 'not_required';

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (
    type in (
      'booking_created',
      'booking_approved',
      'booking_rejected',
      'booking_rescheduled',
      'booking_expired',
      'payment_success',
      'payment_refunded',
      'meeting_link_manual_required',
      'session_reminder'
    )
  );

create index if not exists bookings_approval_deadline_idx
  on public.bookings (approval_deadline)
  where status = 'pending';

create index if not exists bookings_status_schedule_idx
  on public.bookings (status, scheduled_date, start_time);

create index if not exists notifications_related_booking_idx
  on public.notifications (related_booking_id);

create unique index if not exists reviews_booking_unique_idx
  on public.reviews (booking_id);
