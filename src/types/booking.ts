export interface AvailableBookingSlot {
  endTime: string;
  startTime: string;
}

export interface AvailableBookingDate {
  date: string;
  slots: AvailableBookingSlot[];
}
