const WAT_TIMEZONE = "Africa/Lagos";

export function formatDate(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WAT_TIMEZONE,
  }).format(parsedDate);
}

export function formatTime(time: string): string {
  const parsedDate = new Date(`1970-01-01T${time}`);

  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: WAT_TIMEZONE,
  }).format(parsedDate);
}

export function formatDateTime(date: string, time: string): string {
  const parsedDate = new Date(`${date}T${time}`);

  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: WAT_TIMEZONE,
  })
    .format(parsedDate)
    .replace(",", "")
    .concat(" WAT");
}

export function isPast(date: string, time: string): boolean {
  const targetDate = new Date(`${date}T${time}`);

  return targetDate.getTime() < Date.now();
}

export function getDayLabel(dayOfWeek: number): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return days[dayOfWeek] ?? "";
}
