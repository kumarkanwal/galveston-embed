import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildQuoteRequest } from "../src/app/trip/build-quote-request";
import type { CoreServiceCode, TripFormState } from "../src/app/trip/types";
import { validateTrip } from "../src/app/trip/validation";

const ADDRESS = {
  address: "123 Strand St, Galveston, TX 77550, USA",
  zipcode: "77550",
  location: { lat: 29.307, lng: -94.7977 },
};

function formFor(service: CoreServiceCode): TripFormState {
  return {
    service,
    pickupDate: "2026-10-20",
    pickupTime: "10:00",
    passengers: 2,
    luggage: 3,
    pickupAddress: ADDRESS,
    dropoffAddress: ADDRESS,
    pickupAirportId: "airport-pickup",
    dropoffAirportId: "airport-dropoff",
    airline: { id: "airline-1", name: "Example Air" },
    flightNumber: "123",
  };
}

function quoteSchemaKeys(): string[] {
  const path = resolve(process.cwd(), "src/api/openapi.json");
  const schema = JSON.parse(readFileSync(path, "utf8")) as {
    components: { schemas: { TaxiQuoteRequest: { properties: Record<string, unknown> } } };
  };
  return Object.keys(schema.components.schemas.TaxiQuoteRequest.properties).sort();
}

describe("quote request builder", () => {
  it.each(["one_way", "airport_pickup", "airport_dropoff"] as const)(
    "uses only schema keys for %s",
    (service) => {
      expect(Object.keys(buildQuoteRequest(formFor(service))).sort()).toEqual(quoteSchemaKeys());
    },
  );

  it("sets one-way fields and nulls airport fields", () => {
    expect(buildQuoteRequest(formFor("one_way"))).toMatchObject({
      service_type: "one_way",
      pickup_address: ADDRESS.address,
      pickup_zipcode: "77550",
      dropoff_address: ADDRESS.address,
      dropoff_zipcode: "77550",
      pickup_airport_id: null,
      dropoff_airport_id: null,
      airline: null,
      flight_number: null,
      hours: null,
      stops: [],
    });
  });

  it("sets only the applicable airport side", () => {
    expect(buildQuoteRequest(formFor("airport_pickup"))).toMatchObject({
      pickup_address: null,
      pickup_zipcode: null,
      pickup_airport_id: "airport-pickup",
      dropoff_airport_id: null,
      airline: "Example Air",
    });
    expect(buildQuoteRequest(formFor("airport_dropoff"))).toMatchObject({
      dropoff_address: null,
      dropoff_zipcode: null,
      pickup_airport_id: null,
      dropoff_airport_id: "airport-dropoff",
      airline: "Example Air",
    });
  });
});

describe("trip validation", () => {
  const context = {
    advanceBookingHours: 12,
    now: new Date("2026-10-19T15:00:00.000Z"),
    timeZone: "America/Chicago",
  };

  it.each([
    ["one_way", "pickupAddress"],
    ["one_way", "dropoffAddress"],
    ["airport_pickup", "pickupAirportId"],
    ["airport_pickup", "airline"],
    ["airport_pickup", "flightNumber"],
    ["airport_pickup", "dropoffAddress"],
    ["airport_dropoff", "pickupAddress"],
    ["airport_dropoff", "dropoffAirportId"],
    ["airport_dropoff", "airline"],
    ["airport_dropoff", "flightNumber"],
  ] as const)("requires %s.%s", (service, field) => {
    const form = formFor(service);
    Object.assign(form, { [field]: field.endsWith("Address") || field === "airline" ? null : "" });
    expect(validateTrip(form, context)).toHaveProperty(field);
  });

  it("uses the business timezone and configured advance hours", () => {
    const form = formFor("one_way");
    form.pickupDate = "2026-10-19";
    form.pickupTime = "21:59";
    expect(validateTrip(form, context).pickupTime).toContain("12 hour(s)");
    form.pickupTime = "22:00";
    expect(validateTrip(form, context).pickupTime).toBeUndefined();
  });
});
