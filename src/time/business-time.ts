export interface BusinessDateTimeParts {
  date: string;
  time: string;
}

export type TimeComparison = -1 | 0 | 1;

function part(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((candidate) => candidate.type === type)?.value ?? "";
}

export function businessDateTimeParts(
  instant: Date,
  timeZone: string,
): BusinessDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(instant);
  const date = `${part(parts, "year")}-${part(parts, "month")}-${part(parts, "day")}`;
  const time = `${part(parts, "hour")}:${part(parts, "minute")}`;
  return { date, time };
}

export function formatBusinessDateTime(instant: Date, timeZone: string): string {
  const { date, time } = businessDateTimeParts(instant, timeZone);
  return `${date} ${time}`;
}

export function compareWithBusinessNow(
  date: string,
  time: string,
  now: Date,
  timeZone: string,
): TimeComparison {
  const current = businessDateTimeParts(now, timeZone);
  const selectedValue = `${date}T${time}`;
  const currentValue = `${current.date}T${current.time}`;
  if (selectedValue < currentValue) return -1;
  if (selectedValue > currentValue) return 1;
  return 0;
}

export function meetsAdvanceBookingRequirement(
  date: string,
  time: string,
  now: Date,
  timeZone: string,
  advanceHours: number,
): boolean {
  const millisecondsPerHour = 60 * 60 * 1000;
  const threshold = new Date(now.getTime() + advanceHours * millisecondsPerHour);
  const minimum = businessDateTimeParts(threshold, timeZone);
  return `${date}T${time}` >= `${minimum.date}T${minimum.time}`;
}

