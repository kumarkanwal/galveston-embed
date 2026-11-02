import { describe, expect, it } from "vitest";

import type { ShuttleTripForm } from "../src/app/shuttle/types";
import { validateShuttleTrip } from "../src/app/shuttle/validation";

const FORM: ShuttleTripForm = {
  fromId: "from", toId: "to", date: "2026-10-30", returnDate: "2026-11-01",
  roundTrip: true, largeBags: 0, smallBags: 0,
  paxAdult: 1, paxSenior: 0, paxChild: 0,
};

describe("shuttle trip validation", () => {
  it("rejects a departure before the business-local current date", () => {
    expect(validateShuttleTrip({ ...FORM, date: "2026-10-22" }, "2026-10-23"))
      .toHaveProperty("date", "Departure date cannot be in the past.");
  });

  it("requires at least one passenger and chronological return date", () => {
    const errors = validateShuttleTrip({
      ...FORM, paxAdult: 0, returnDate: "2026-10-29",
    }, "2026-10-23");
    expect(errors.paxAdult).toBe("Select at least one passenger.");
    expect(errors.returnDate).toBe("Return date must be on or after the departure date.");
  });

  it("enforces schema and business bag limits", () => {
    expect(validateShuttleTrip({ ...FORM, largeBags: 100 }, "2026-10-23").largeBags)
      .toBe("Select a valid check-in bag count.");
    expect(validateShuttleTrip({ ...FORM, largeBags: 7, smallBags: 6 }, "2026-10-23", 12)
      .largeBags).toBe("Select no more than 12 bags in total.");
  });
});
