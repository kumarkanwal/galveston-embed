import { describe, expect, it } from "vitest";

import {
  businessDateTimeParts,
  compareWithBusinessNow,
  formatBusinessDateTime,
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
});

