export type UserRole = "customer" | "consultant" | "admin";
export type ListingStatus = "pending" | "approved" | "rejected";
export type ConsultationType = "physical" | "virtual" | "both";
export type BookingStatus =
  | "initiated"
  | "pending"
  | "approved"
  | "completed"
  | "rejected"
  | "expired"
  | "refunded";
export type PaymentStatus = "unpaid" | "paid" | "refunded";
export type NotificationType =
  | "booking_created"
  | "booking_approved"
  | "booking_rejected"
  | "payment_success"
  | "payment_refunded"
  | "session_reminder";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  is_suspended: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Listing {
  id: string;
  consultant_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  featured_image_url: string | null;
  consultation_type: ConsultationType;
  duration_minutes: number;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  consultant?: Profile;
  average_rating?: number;
  review_count?: number;
}

export interface AvailabilitySlot {
  id: string;
  consultant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  listing_id: string;
  customer_id: string;
  consultant_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  consultation_type: "physical" | "virtual";
  status: BookingStatus;
  payment_reference: string | null;
  payment_status: PaymentStatus;
  amount_paid: number | null;
  meet_link: string | null;
  consultant_notes: string | null;
  approval_deadline: string | null;
  created_at: string;
  updated_at: string;
  listing?: Listing;
  customer?: Profile;
  consultant?: Profile;
}

export interface Review {
  id: string;
  booking_id: string;
  listing_id: string;
  customer_id: string;
  consultant_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: NotificationType;
  related_booking_id: string | null;
  is_read: boolean;
  created_at: string;
}
