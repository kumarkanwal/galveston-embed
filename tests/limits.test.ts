import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import type { Business } from "../src/api/client";
import { partyLimits, QUOTE_SCHEMA_LIMITS } from "../src/app/trip/limits";

const BUSINESS = {
  id: "business-1",
  name: "Island Transit",
  type: "taxi",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  max_passengers: 12,
  max_luggage: 10,
  settings: {
    advance_booking_hours: 0,
    insurance_enabled: false,
    insurance_pct: "0.00",
    payment_methods: ["cash"],
  },
} satisfies Business;

function schemaMaximum(field: "passengers" | "luggage"): number {
  const contents = readFileSync(resolve(process.cwd(), "src/api/openapi.json"), "utf8");
  const schema = JSON.parse(contents) as {
    components: { schemas: { TaxiQuoteRequest: {
      properties: Record<string, { maximum?: number }>;
    } } };
  };
  const maximum = schema.components.schemas.TaxiQuoteRequest.properties[field]?.maximum;
  if (maximum === undefined) throw new Error(`Missing schema maximum for ${field}.`);
  return maximum;
}

describe("party limits", () => {
  it("uses business limits capped by the request schema", () => {
    expect(partyLimits(BUSINESS)).toEqual({ passengers: 12, luggage: 10 });
    expect(partyLimits({ ...BUSINESS, max_passengers: 120, max_luggage: 110 }))
      .toEqual(QUOTE_SCHEMA_LIMITS);
  });

  it.each(["max_passengers", "max_luggage"] as const)(
    "returns unavailable when %s is null",
    (field) => expect(partyLimits({ ...BUSINESS, [field]: null })).toBeNull(),
  );

  it("keeps the runtime caps synchronized with OpenAPI", () => {
    expect(QUOTE_SCHEMA_LIMITS.passengers).toBe(schemaMaximum("passengers"));
    expect(QUOTE_SCHEMA_LIMITS.luggage).toBe(schemaMaximum("luggage"));
  });
});
