import { describe, expect, it } from "vitest";

import { IdempotencyKeyManager, stableSerialize } from "../src/api/idempotency";
import {
  buildReturnQuery,
  buildShuttleBooking,
  buildShuttleQuote,
  buildShuttleSearchQuery,
} from "../src/app/shuttle/requests";
import type { ShuttleSelection, ShuttleTripForm } from "../src/app/shuttle/types";
import {
  DEPARTURE, DESTINATION_LOCATION, ORIGIN_LOCATION, PRIVATE_CAR, SEARCH_RESULT,
} from "./shuttle-fixtures";

const TRIP: ShuttleTripForm = {
  fromId: ORIGIN_LOCATION.id,
  toId: DESTINATION_LOCATION.id,
  date: "2026-10-30",
  returnDate: "2026-11-01",
  roundTrip: true,
  largeBags: 2,
  smallBags: 1,
  paxAdult: 2,
  paxSenior: 1,
  paxChild: 0,
};
const SCHEDULED = { kind: "scheduled", date: TRIP.date, departure: DEPARTURE,
  route: SEARCH_RESULT.route } as const;
const PRIVATE = { kind: "private", date: TRIP.date, car: PRIVATE_CAR,
  route: SEARCH_RESULT.route } as const;
const BASE_SELECTION = {
  trip: TRIP,
  from: ORIGIN_LOCATION,
  to: DESTINATION_LOCATION,
  outbound: SCHEDULED,
  returnLeg: null,
} satisfies ShuttleSelection;
const CONTACT = {
  acceptedTerms: true, comments: "Dock 2", email: "ada@example.com",
  firstName: " Ada ", lastName: " Lovelace ", phone: " 555-0100 ",
};

describe("shuttle request builders", () => {
  it("builds the documented outbound search query", () => {
    expect(buildShuttleSearchQuery(TRIP)).toEqual({
      from_location_id: TRIP.fromId, to_location_id: TRIP.toId, date: TRIP.date,
      pax_adult: 2, pax_senior: 1, pax_child: 0,
    });
  });

  it("keeps a zero-adult senior party in the search request", () => {
    expect(buildShuttleSearchQuery({ ...TRIP, paxAdult: 0, paxSenior: 1 })).toMatchObject({
      pax_adult: 0, pax_senior: 1, pax_child: 0,
    });
  });

  it("identifies the fixed outbound schedule for return search", () => {
    expect(buildReturnQuery(TRIP, SCHEDULED)).toEqual({
      from_location_id: TRIP.fromId, to_location_id: TRIP.toId,
      date: TRIP.returnDate, outbound_schedule_id: DEPARTURE.schedule_id,
      pax_adult: 2, pax_senior: 1, pax_child: 0,
    });
  });

});

describe("private return-search request builder", () => {
  it("identifies a date-only private outbound car for return search", () => {
    expect(buildReturnQuery(TRIP, PRIVATE)).toEqual({
      from_location_id: TRIP.fromId, to_location_id: TRIP.toId,
      date: TRIP.returnDate, outbound_route_id: PRIVATE_CAR.route_id,
      outbound_vehicle_type_id: PRIVATE_CAR.vehicle_type_id,
      outbound_pickup_date: TRIP.date,
      pax_adult: 2, pax_senior: 1, pax_child: 0,
    });
  });

});

describe("shuttle quote request builder", () => {
  it("builds scheduled-only quote legs without customer pickup times", () => {
    const selection = { ...BASE_SELECTION, returnLeg: SCHEDULED };
    expect(buildShuttleQuote(selection, "SAVE10")).toEqual({
      legs: [{
        departure_type: "scheduled", schedule_id: DEPARTURE.schedule_id,
        pax_adult: 2, pax_senior: 1, pax_child: 0,
      }, {
        departure_type: "scheduled", schedule_id: DEPARTURE.schedule_id,
        pax_adult: 2, pax_senior: 1, pax_child: 0,
      }],
      large_bags: 2, small_bags: 1,
      insurance_selected: false, payment_method: "cash", promo_code: "SAVE10",
    });
    for (const leg of buildShuttleQuote(selection, null).legs) {
      expect(leg.departure_type).toBe("scheduled");
      expect(leg).not.toHaveProperty("pickup_time");
      expect(leg).not.toHaveProperty("vehicle_type_id");
      expect(leg).not.toHaveProperty("pickup_address");
      expect(leg).not.toHaveProperty("dropoff_address");
    }
  });

  it("builds date-only private quote legs without a time or schedule", () => {
    const quote = buildShuttleQuote({ ...BASE_SELECTION, outbound: PRIVATE }, null);
    expect(quote.legs).toEqual([{
      departure_type: "private", route_id: PRIVATE_CAR.route_id,
      vehicle_type_id: PRIVATE_CAR.vehicle_type_id, pickup_date: TRIP.date,
      pax_adult: 2, pax_senior: 1, pax_child: 0,
    }]);
    expect(quote.legs[0]).not.toHaveProperty("pickup_time");
    expect(quote.legs[0]).not.toHaveProperty("schedule_id");
  });
});

describe("shuttle booking request builder", () => {
  it("sends only the selected date and identifiers for a private leg", () => {
    const selection = { ...BASE_SELECTION, outbound: PRIVATE };
    const body = buildShuttleBooking(selection, CONTACT, {
      outboundPickup: null, outboundDropoff: null, returnPickup: null, returnDropoff: null,
    }, null);
    expect(body.legs[0]).toMatchObject({
      departure_type: "private", route_id: PRIVATE_CAR.route_id,
      vehicle_type_id: PRIVATE_CAR.vehicle_type_id, pickup_date: TRIP.date,
    });
    expect(body.legs[0]).not.toHaveProperty("pickup_time");
    expect(body.legs[0]).not.toHaveProperty("schedule_id");
  });

  it("puts separate addresses inside each booking leg and omits the deprecated top level", () => {
    const addressRoute = { ...SEARCH_RESULT.route,
      from_requires_address: true, to_requires_address: true };
    const selection = { ...BASE_SELECTION,
      outbound: { ...SCHEDULED, route: addressRoute },
      returnLeg: { ...SCHEDULED, route: { ...addressRoute, id: "return-route" } } };
    const body = buildShuttleBooking(selection, CONTACT, {
      outboundPickup: { address: " Airport curb ", zipcode: null, location: { lat: 1, lng: 2 } },
      outboundDropoff: { address: " Hotel lobby ", zipcode: "77550",
        location: { lat: 3, lng: 4 } },
      returnPickup: { address: " Hotel side door ", zipcode: "77550",
        location: { lat: 3, lng: 4 } },
      returnDropoff: { address: " Airport terminal ", zipcode: null,
        location: { lat: 1, lng: 2 } },
    }, null);
    expect(body).toMatchObject({
      payment: { method: "cash" }, insurance_selected: false,
      large_bags: 2, small_bags: 1,
      customer: { first_name: "Ada", last_name: "Lovelace",
        email: "ada@example.com", phone: "555-0100" },
      comments: "Dock 2", accepted_terms: true,
      legs: [
        { pickup_address: "Airport curb", dropoff_address: "Hotel lobby" },
        { pickup_address: "Hotel side door", dropoff_address: "Airport terminal" },
      ],
    });
    expect(body).not.toHaveProperty("address");
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("promo_code");
  });
});

describe("shuttle cart idempotency", () => {
  it("reuses a key for an unchanged body and changes it with the cart", async () => {
    let next = 0;
    const fingerprints = async (body: object) => stableSerialize(body);
    const manager = new IdempotencyKeyManager(() => `key-${++next}`, null, fingerprints);
    const body = buildShuttleBooking(BASE_SELECTION, CONTACT, {
      outboundPickup: null, outboundDropoff: null, returnPickup: null, returnDropoff: null,
    }, null);
    const first = await manager.getKey(body);
    await expect(manager.getKey({ ...body })).resolves.toBe(first);
    await expect(manager.getKey({ ...body, promo_code: "SAVE10" })).resolves.not.toBe(first);
  });
});
