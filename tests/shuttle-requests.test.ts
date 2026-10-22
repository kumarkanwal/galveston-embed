import { describe, expect, it } from "vitest";

import { IdempotencyKeyManager, stableSerialize } from "../src/api/idempotency";
import {
  buildReturnQuery,
  buildShuttleBooking,
  buildShuttleQuote,
  buildShuttleSearchQuery,
} from "../src/app/shuttle/requests";
import type { ShuttleSelection, ShuttleTripForm } from "../src/app/shuttle/types";
import { DEPARTURE, DESTINATION_LOCATION, ORIGIN_LOCATION } from "./shuttle-fixtures";

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
const SCHEDULED = { kind: "scheduled", date: TRIP.date, departure: DEPARTURE } as const;
const ON_REQUEST = {
  kind: "on_request", date: TRIP.date, time: "14:15",
  routeId: "77777777-7777-7777-7777-777777777777",
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
  });

  it("builds a cash booking without client-owned amounts", () => {
    const body = buildShuttleBooking(BASE_SELECTION, CONTACT, " Terminal curb ", null);
    expect(body).toMatchObject({
      payment: { method: "cash" }, insurance_selected: false,
      customer: { first_name: "Ada", last_name: "Lovelace",
        email: "ada@example.com", phone: "555-0100" },
      comments: "Dock 2", address: "Terminal curb", accepted_terms: true,
    });
    expect(body).not.toHaveProperty("total");
    expect(body).not.toHaveProperty("promo_code");
  });
});

describe("shuttle cart idempotency", () => {
  it("reuses a key for an unchanged body and changes it with the cart", async () => {
    let next = 0;
    const fingerprints = async (body: object) => stableSerialize(body);
    const manager = new IdempotencyKeyManager(() => `key-${++next}`, null, fingerprints);
    const body = buildShuttleBooking(BASE_SELECTION, CONTACT, "", null);
    const first = await manager.getKey(body);
    await expect(manager.getKey({ ...body })).resolves.toBe(first);
    await expect(manager.getKey({ ...body, promo_code: "SAVE10" })).resolves.not.toBe(first);
  });
});
