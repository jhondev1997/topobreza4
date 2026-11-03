// Peru is UTC-5 all year (no DST). Calendar logic is pinned to it so that the
// results do not depend on the timezone of the host.
const DAY_MS = 86_400_000;
const LIMA_OFFSET_MS = 5 * 3_600_000;

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"];

const limaDay = (date: Date) => Math.floor((date.getTime() - LIMA_OFFSET_MS) / DAY_MS);

// Day 0 (1970-01-01) was a Thursday, 3 days after a Monday.
const mondayOf = (day: number) => day - ((day + 3) % 7);

export function daysBetween(from: Date, to: Date) {
  return Math.max(0, limaDay(to) - limaDay(from));
}

export function startOfWeek(date: Date) {
  return new Date(mondayOf(limaDay(date)) * DAY_MS + LIMA_OFFSET_MS);
}

export function isoWeekNumber(date: Date) {
  // The ISO week belongs to the year of its Thursday.
  const thursday = mondayOf(limaDay(date)) + 3;
  const year = new Date(thursday * DAY_MS).getUTCFullYear();
  const firstDayOfYear = Date.UTC(year, 0, 1) / DAY_MS;
  return Math.floor((thursday - firstDayOfYear) / 7) + 1;
}

const WEEKDAYS = ["LUNES", "MARTES", "MIÉRCOLES", "JUEVES", "VIERNES", "SÁBADO", "DOMINGO"];

// Midnight Lima time, `days` days after the given date.
export function daysAfter(date: Date, days: number) {
  return new Date((limaDay(date) + days) * DAY_MS + LIMA_OFFSET_MS);
}

// VIERNES 30 OCT
export function formatLongDate(date: Date) {
  const day = limaDay(date);
  return `${WEEKDAYS[day - mondayOf(day)]} ${formatShortDate(date)}`;
}

// Midnight Lima time of the first Saturday after the given date.
export function nextSaturday(date: Date) {
  const day = limaDay(date);
  const saturday = mondayOf(day) + 5;
  return new Date((saturday > day ? saturday : saturday + 7) * DAY_MS + LIMA_OFFSET_MS);
}

// 19:02
export function formatTime(date: Date) {
  const lima = new Date(date.getTime() - LIMA_OFFSET_MS);
  return [lima.getUTCHours(), lima.getUTCMinutes()]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

// 00:47:12
export function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(totalSeconds / 3600), Math.floor(totalSeconds / 60) % 60, totalSeconds % 60]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

// 1 H 12 MIN
export function formatDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  return hours > 0 ? `${hours} H ${totalMinutes % 60} MIN` : `${totalMinutes} MIN`;
}

export function formatShortDate(date: Date) {
  const lima = new Date(date.getTime() - LIMA_OFFSET_MS);
  return `${lima.getUTCDate()} ${MONTHS[lima.getUTCMonth()]}`;
}
