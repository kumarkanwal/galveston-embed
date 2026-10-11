import { describe, expect, it } from "vitest";

import {
  businessDateTimeParts,
  compareWithBusinessNow,
  formatBusinessDateTime,
  formatBusinessLocalDateTime,
  meetsAdvanceBookingRequirement,
} from "../src/time";

describe("business timezone helpers", () => {
  it("uses the business timezone, not the visitor timezone", () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Asia/Tokyo");
    const instant = new Date("2026-07-01T03:30:00.000Z");
    expect(businessDateTimeParts(instant, "America/Chicago")).toEqual({
      date: "2026-06-30",
      time: "22:30",
    });
    expect(formatBusinessDateTime(instant, "America/Chicago")).toBe("2026-06-30 22:30");
  });

  it("compares a selection with the current business-local time", () => {
    const now = new Date("2026-07-01T03:30:00.000Z");
    expect(compareWithBusinessNow("2026-06-30", "22:29", now, "America/Chicago")).toBe(-1);
    expect(compareWithBusinessNow("2026-06-30", "22:30", now, "America/Chicago")).toBe(0);
    expect(compareWithBusinessNow("2026-06-30", "22:31", now, "America/Chicago")).toBe(1);
  });

  it("formats a stored business-local selection without the visitor timezone", () => {
    expect(formatBusinessLocalDateTime("2026-10-12", "00:44"))
      .toBe("Monday, October 12, 2026 at 12:44 AM");
  });

  it("checks advance hours in the business timezone", () => {
    const now = new Date("2026-07-01T03:30:00.000Z");
    expect(meetsAdvanceBookingRequirement(
      "2026-07-01", "10:30", now, "America/Chicago", 12,
    )).toBe(true);
    expect(meetsAdvanceBookingRequirement(
      "2026-07-01", "10:29", now, "America/Chicago", 12,
    )).toBe(false);
  });

  it("counts elapsed advance hours across the Chicago daylight-saving fallback", () => {
    const firstOneThirty = new Date("2026-11-01T06:30:00.000Z");
    expect(businessDateTimeParts(firstOneThirty, "America/Chicago")).toEqual({
      date: "2026-11-01",
      time: "01:30",
    });
    expect(meetsAdvanceBookingRequirement(
      "2026-11-01", "02:29", firstOneThirty, "America/Chicago", 2,
    )).toBe(false);
    expect(meetsAdvanceBookingRequirement(
      "2026-11-01", "02:30", firstOneThirty, "America/Chicago", 2,
    )).toBe(true);
  });
});

