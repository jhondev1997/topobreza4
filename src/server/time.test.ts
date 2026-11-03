import { describe, expect, it } from "vitest";
import {
  daysAfter,
  daysBetween,
  formatLongDate,
  formatDuration,
  formatElapsed,
  formatShortDate,
  formatTime,
  isoWeekNumber,
  nextSaturday,
  startOfWeek,
} from "./time";

describe("time in Lima", () => {
  it("counts calendar days, not 24 hour spans", () => {
    // 23:30 and 00:30 of the next day in Lima.
    expect(daysBetween(new Date("2026-10-30T04:30:00Z"), new Date("2026-10-30T05:30:00Z"))).toBe(1);
    // Same day in Lima, although it crosses midnight in UTC.
    expect(daysBetween(new Date("2026-10-29T23:00:00Z"), new Date("2026-10-30T04:00:00Z"))).toBe(0);
  });

  it("never returns negative days", () => {
    expect(daysBetween(new Date("2026-10-30T12:00:00Z"), new Date("2026-10-20T12:00:00Z"))).toBe(0);
  });

  it("starts the week on Monday at midnight Lima time", () => {
    // Friday 30 Oct 2026.
    expect(startOfWeek(new Date("2026-10-30T15:00:00Z")).toISOString()).toBe("2026-10-26T05:00:00.000Z");
    // Sunday 1 Nov at 23:00 in Lima is still the same week.
    expect(startOfWeek(new Date("2026-11-02T04:00:00Z")).toISOString()).toBe("2026-10-26T05:00:00.000Z");
    // Monday itself.
    expect(startOfWeek(new Date("2026-10-26T05:00:00Z")).toISOString()).toBe("2026-10-26T05:00:00.000Z");
  });

  it("computes the ISO week number", () => {
    expect(isoWeekNumber(new Date("2026-10-30T15:00:00Z"))).toBe(44);
    // 1 Jan 2027 is a Friday, so it belongs to week 53 of 2026.
    expect(isoWeekNumber(new Date("2027-01-01T15:00:00Z"))).toBe(53);
    expect(isoWeekNumber(new Date("2027-01-04T15:00:00Z"))).toBe(1);
  });

  it("finds the next Saturday, never today", () => {
    // Friday 30 Oct 2026.
    expect(nextSaturday(new Date("2026-10-30T15:00:00Z")).toISOString()).toBe("2026-10-31T05:00:00.000Z");
    // Saturday 31 Oct goes to the following one.
    expect(nextSaturday(new Date("2026-10-31T15:00:00Z")).toISOString()).toBe("2026-11-07T05:00:00.000Z");
    // Sunday 1 Nov.
    expect(nextSaturday(new Date("2026-11-01T15:00:00Z")).toISOString()).toBe("2026-11-07T05:00:00.000Z");
  });

  it("adds days from midnight in Lima", () => {
    expect(daysAfter(new Date("2026-10-30T15:00:00Z"), 7).toISOString()).toBe("2026-11-06T05:00:00.000Z");
    // 23:00 on the 29th in Lima.
    expect(daysAfter(new Date("2026-10-30T04:00:00Z"), 7).toISOString()).toBe("2026-11-05T05:00:00.000Z");
  });

  it("formats the long date", () => {
    expect(formatLongDate(new Date("2026-10-30T15:00:00Z"))).toBe("VIERNES 30 OCT");
    expect(formatLongDate(new Date("2026-11-02T04:00:00Z"))).toBe("DOMINGO 1 NOV");
  });

  it("formats the time in Lima", () => {
    expect(formatTime(new Date("2026-10-31T00:02:00Z"))).toBe("19:02");
    expect(formatTime(new Date("2026-10-30T14:05:00Z"))).toBe("09:05");
  });

  it("formats the session timer and duration", () => {
    expect(formatElapsed(47 * 60_000 + 12_000)).toBe("00:47:12");
    expect(formatElapsed(100 * 3_600_000)).toBe("100:00:00");
    expect(formatElapsed(-5000)).toBe("00:00:00");
    expect(formatDuration(72 * 60_000)).toBe("1 H 12 MIN");
    expect(formatDuration(47 * 60_000)).toBe("47 MIN");
    expect(formatDuration(30_000)).toBe("0 MIN");
  });

  it("formats dates for the session log", () => {
    expect(formatShortDate(new Date("2026-10-28T15:00:00Z"))).toBe("28 OCT");
    // Still 31 Dec in Lima.
    expect(formatShortDate(new Date("2027-01-01T03:00:00Z"))).toBe("31 DIC");
  });
});
