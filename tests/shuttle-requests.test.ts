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
  DEPARTURE, DESTINATION_LOCATION, ORIGIN_LOCATION, SEARCH_RESULT,
} from "./shuttle-fixtures";

const TRIP: ShuttleTripForm = {
  fromId: ORIGIN_LOCATION.id,
  toId: DESTINATION_LOCATION.id,
  date: "2026-10-30",
  returnDate: "2026-11-01",
  roundTrip: true,
  paxAdult: 2,
  paxSenior: 1,
  paxChild: 0,
};
const SCHEDULED = { kind: "scheduled", date: TRIP.date, departure: DEPARTURE,
  route: SEARCH_RESULT.route } as const;
const ON_REQUEST = {
  kind: "on_request", date: TRIP.date, time: "14:15",
  serviceMode: "shared",
  routeId: "77777777-7777-7777-7777-777777777777",
  route: SEARCH_RESULT.route,
  vehicleTypeId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  vehicleTypeName: "Executive Van",
} as const;
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

  it("identifies scheduled and on-request outbound legs for return search", () => {
    expect(buildReturnQuery(TRIP, SCHEDULED)).toMatchObject({
      date: TRIP.returnDate, outbound_schedule_id: DEPARTURE.schedule_id,
    });
    expect(buildReturnQuery(TRIP, ON_REQUEST)).toMatchObject({
      date: TRIP.returnDate, outbound_route_id: ON_REQUEST.routeId,
      outbound_vehicle_type_id: ON_REQUEST.vehicleTypeId,
      outbound_pickup_date: ON_REQUEST.date, outbound_pickup_time: ON_REQUEST.time,
    });
  });

  it("builds cash-only scheduled and on-request quote legs", () => {
    const selection = { ...BASE_SELECTION, outbound: ON_REQUEST, returnLeg: SCHEDULED };
    expect(buildShuttleQuote(selection, "SAVE10")).toEqual({
      legs: [{
        departure_type: "on_request", route_id: ON_REQUEST.routeId,
        vehicle_type_id: ON_REQUEST.vehicleTypeId, pickup_date: ON_REQUEST.date,
        pickup_time: ON_REQUEST.time, pax_adult: 2, pax_senior: 1, pax_child: 0,
      }, {
        departure_type: "scheduled", schedule_id: DEPARTURE.schedule_id,
        pax_adult: 2, pax_senior: 1, pax_child: 0,
      }],
      insurance_selected: false, payment_method: "cash", promo_code: "SAVE10",
    });
    for (const leg of buildShuttleQuote(selection, null).legs) {
      expect(leg).not.toHaveProperty("pickup_address");
      expect(leg).not.toHaveProperty("dropoff_address");
    }
  });
});

describe("shuttle booking request builder", () => {
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
