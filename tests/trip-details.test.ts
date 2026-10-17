import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { buildBookingRequest, buildBreakdownRequest } from "../src/app/confirm/build-requests";
import { buildQuoteRequest } from "../src/app/trip/build-quote-request";
import { tripMapPoints } from "../src/app/trip/TripDetails";
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
    pickupAirportName: "Pickup Airport",
    pickupAirportLocation: { lat: 29.99, lng: -95.34 },
    dropoffAirportId: "airport-dropoff",
    dropoffAirportName: "Dropoff Airport",
    dropoffAirportLocation: { lat: 29.65, lng: -95.28 },
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

  it("airport id still sent", () => {
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

describe("airport pricing request invariants", () => {
  it("no pricing change", () => {
    const trip = formFor("airport_pickup");
    const breakdown = buildBreakdownRequest(trip, "vehicle-1", 2);
    const booking = buildBookingRequest(trip, "vehicle-1", 2, {
      acceptedTerms: true,
      comments: "",
      email: "rider@example.com",
      firstName: "Test",
      lastName: "Rider",
      phone: "",
    });
    expect(breakdown).toMatchObject({
      pickup_airport_id: "airport-pickup",
      pickup_address: null,
      pickup_zipcode: null,
      payment_method: "cash",
      vehicle_type_id: "vehicle-1",
    });
    expect(booking).toMatchObject({
      pickup_airport_id: "airport-pickup",
      pickup_address: null,
      pickup_zipcode: null,
      payment: { method: "cash" },
      vehicle_type_id: "vehicle-1",
    });
  });
});

describe("step-one map endpoints", () => {
  it("uses both selected address coordinates for one-way", () => {
    const form = formFor("one_way");
    expect(tripMapPoints(form)).toEqual({
      pickup: form.pickupAddress?.location,
      dropoff: form.dropoffAddress?.location,
    });
  });

  it.each([
    ["airport_pickup", "pickup", "pickupAirportLocation"],
    ["airport_dropoff", "dropoff", "dropoffAirportLocation"],
  ] as const)("uses the selected airport coordinates for %s", (service, side, field) => {
    const form = formFor(service);
    expect(tripMapPoints(form)[side]).toBe(form[field]);
  });
});

const VALIDATION_CONTEXT = {
  advanceBookingHours: 12,
  limits: { passengers: 8, luggage: 8 },
  now: new Date("2026-10-19T15:00:00.000Z"),
  timeZone: "America/Chicago",
};

describe("trip field validation", () => {
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
    expect(validateTrip(form, VALIDATION_CONTEXT)).toHaveProperty(field);
  });
});

describe("trip date and time validation", () => {
  it("uses the business timezone and configured advance hours", () => {
    const form = formFor("one_way");
    form.pickupDate = "2026-10-19";
    form.pickupTime = "21:59";
    expect(validateTrip(form, VALIDATION_CONTEXT).pickupTime).toContain("12 hour(s)");
    form.pickupTime = "22:00";
    expect(validateTrip(form, VALIDATION_CONTEXT).pickupTime).toBeUndefined();
  });

  it("rejects past Chicago wall times even when the visitor is elsewhere", () => {
    const form = formFor("one_way");
    const chicagoContext = {
      advanceBookingHours: 0,
      limits: { passengers: 8, luggage: 8 },
      now: new Date("2026-07-01T03:30:00.000Z"),
      timeZone: "America/Chicago",
    };
    form.pickupDate = "2026-06-30";
    form.pickupTime = "22:29";
    expect(validateTrip(form, chicagoContext).pickupTime).toBe(
      "Pickup time cannot be in the past.",
    );
    form.pickupTime = "22:30";
    expect(validateTrip(form, chicagoContext).pickupTime).toBeUndefined();
  });

  it("requires customers to select a pickup time", () => {
    const form = formFor("one_way");
    form.pickupTime = "";
    expect(validateTrip(form, VALIDATION_CONTEXT).pickupTime).toBe("Select a pickup time.");
  });
});
