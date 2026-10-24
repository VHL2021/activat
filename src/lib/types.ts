export type Role = "admin" | "member";

export type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  active: boolean;
};

export type Settings = {
  max_days_ahead: number;
  booking_close_minutes: number;
  cancel_deadline_minutes: number;
  max_active_bookings: number;
  max_per_day: number;
  waitlist_enabled: boolean;
  default_capacity: number;
};

export type ClassType = {
  id: number;
  name: string;
  description: string | null;
  instructor: string | null;
  duration_min: number;
  capacity: number;
  active: boolean;
};

export type SessionOverview = {
  id: number;
  day: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  cancelled: boolean;
  cancel_reason: "closed" | "manual" | null;
  class_type_id: number;
  class_name: string;
  instructor: string | null;
  booked: number;
  waitlist: number;
};

export type MemberSession = {
  id: number;
  day: string;
  start_time: string;
  duration_min: number;
  capacity: number;
  cancelled: boolean;
  class_name: string;
  instructor: string | null;
  booked: number;
  waitlist: number;
  my_status: "booked" | "waitlist" | null;
  waitlist_position: number | null;
  minutes_until: number;
};

export type ClosedDay = { id: number; day: string; kind: string; reason: string | null };
