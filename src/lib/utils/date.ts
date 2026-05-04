const WAT_TIMEZONE = "Africa/Lagos";
const WAT_OFFSET = "+01:00";

function createWatDate(date: string, time = "00:00:00") {
  return new Date(`${date}T${normalizeTimeValue(time)}${WAT_OFFSET}`);
}

function formatIsoDate(date: Date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function normalizeTimeValue(time: string): string {
  const trimmed = time.trim();

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  return trimmed;
}

export function getTodayInWAT(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: WAT_TIMEZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(new Date());
  const partMap = parts.reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== "literal") {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days));

  return formatIsoDate(nextDate);
}

export function getDayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: WAT_TIMEZONE,
  }).format(createWatDate(date));
}

export function formatTime(time: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: WAT_TIMEZONE,
  }).format(createWatDate("1970-01-01", time));
}

export function formatDateTime(date: string, time: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: WAT_TIMEZONE,
  })
    .format(createWatDate(date, time))
    .replace(",", "")
    .concat(" WAT");
}

export function isPast(date: string, time: string): boolean {
  return createWatDate(date, time).getTime() < Date.now();
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
