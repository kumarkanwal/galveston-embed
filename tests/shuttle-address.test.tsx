import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleApiClient } from "../src/api/client";
import {
  addressesAfterRouteChange,
  initialShuttleAddresses,
  shuttleAddressRouteKey,
  updateShuttleAddress,
} from "../src/app/shuttle/address";
import { ShuttleConfirm } from "../src/app/shuttle/ShuttleConfirm";
import type { ShuttleSelection } from "../src/app/shuttle/types";
import {
  DEPARTURE,
  DESTINATION_LOCATION,
  LOCATION_GROUPS,
  ORIGIN_LOCATION,
  SEARCH_RESULT,
  SHUTTLE_BOOKED,
  SHUTTLE_BUSINESS,
  SHUTTLE_QUOTE,
} from "./shuttle-fixtures";

const REQUIRED_SELECTION = {
  trip: { fromId: ORIGIN_LOCATION.id, toId: DESTINATION_LOCATION.id,
    date: "2026-10-30", returnDate: "", roundTrip: false,
    paxAdult: 1, paxSenior: 0, paxChild: 0 },
  from: ORIGIN_LOCATION, to: DESTINATION_LOCATION,
  outbound: { kind: "scheduled", date: "2026-10-30", departure: DEPARTURE,
    route: SEARCH_RESULT.route },
  returnLeg: null,
} satisfies ShuttleSelection;

function clientWith(
  bookShuttle: ShuttleApiClient["bookShuttle"] = vi.fn(async () => SHUTTLE_BOOKED),
): ShuttleApiClient {
  return {
    getBusiness: vi.fn(async () => SHUTTLE_BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []), quote: vi.fn(),
    priceBreakdown: vi.fn(), book: vi.fn(), getShuttleLocations: vi.fn(async () => LOCATION_GROUPS),
    searchShuttle: vi.fn(async () => SEARCH_RESULT),
    searchShuttleReturn: vi.fn(async () => SEARCH_RESULT),
    quoteShuttle: vi.fn(async () => SHUTTLE_QUOTE), bookShuttle,
  };
}

function view(client: ShuttleApiClient, selection: ShuttleSelection = REQUIRED_SELECTION) {
  return <ShuttleConfirm business={SHUTTLE_BUSINESS} client={client} mapsKey="maps-key"
    quote={SHUTTLE_QUOTE} selection={selection} onBack={() => undefined}
    onBooked={() => undefined} onUnavailable={() => undefined} />;
}

function mount(client: ShuttleApiClient, selection: ShuttleSelection = REQUIRED_SELECTION) {
  const root = document.createElement("div");
  document.body.append(root); act(() => render(view(client, selection), root));
  return root;
}

function enter(root: HTMLElement, id: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`Missing ${id}`);
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function fillContact(root: HTMLElement) {
  enter(root, "firstName", "Ada"); enter(root, "lastName", "Lovelace");
  enter(root, "email", "ada@example.com");
  act(() => root.querySelector<HTMLInputElement>('[data-confirm-field="acceptedTerms"]')?.click());
}

function submit(root: HTMLElement) {
  act(() => {
    root.querySelector<HTMLFormElement>(".confirm-form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

beforeEach(() => document.body.replaceChildren());

describe("required shuttle address", () => {
  it.each([
    [true, false, ["Pickup address"]],
    [false, true, ["Drop-off address"]],
    [true, true, ["Pickup address", "Drop-off address"]],
    [false, false, []],
  ])("uses route flags for pickup=%s drop-off=%s", (pickup, dropoff, labels) => {
    const route = { ...SEARCH_RESULT.route,
      from_requires_address: pickup, to_requires_address: dropoff };
    const selection = { ...REQUIRED_SELECTION,
      outbound: { ...REQUIRED_SELECTION.outbound, route } } satisfies ShuttleSelection;
    const root = mount(clientWith(), selection);
    expect([...root.querySelectorAll(".shuttle-addresses label")]
      .map((label) => label.textContent)).toEqual(labels);
  });

  it("blocks booking when typed text was not selected from Places", async () => {
    const book = vi.fn<ShuttleApiClient["bookShuttle"]>(async () => SHUTTLE_BOOKED);
    const root = mount(clientWith(book)); fillContact(root);
    enter(root, "shuttle-outbound-dropoff-address", "A"); submit(root);
    await vi.waitFor(() => expect(root.textContent)
      .toContain("Choose a street address or airport."));
    expect(book).not.toHaveBeenCalled();
  });
});

describe("shuttle address state", () => {
  it("clears addresses when the selected route changes", () => {
    const previous = shuttleAddressRouteKey(REQUIRED_SELECTION);
    const next = shuttleAddressRouteKey({
      ...REQUIRED_SELECTION,
      outbound: { ...REQUIRED_SELECTION.outbound,
        route: { ...REQUIRED_SELECTION.outbound.route, id: "new-route" } },
    });
    const selected = { address: "2021 Strand St", zipcode: "77550",
      location: { lat: 29.3, lng: -94.8 } };
    const state = updateShuttleAddress(initialShuttleAddresses(), "outboundDropoff", selected);
    expect(addressesAfterRouteChange(state, previous, previous)).toBe(state);
    expect(addressesAfterRouteChange(state, previous, next).values.outboundDropoff).toBeNull();
  });

  it("uses reversed round-trip defaults until each return field is edited", () => {
    const address = { address: "2021 Strand St, Galveston, TX 77550", zipcode: "77550",
      location: { lat: 29.3, lng: -94.8 } };
    const other = { ...address, address: "7800 Airport Blvd, Houston, TX" };
    let state = updateShuttleAddress(initialShuttleAddresses(), "outboundPickup", address);
    state = updateShuttleAddress(state, "outboundDropoff", other);
    expect(state.values.returnDropoff).toBe(address);
    expect(state.values.returnPickup).toBe(other);
    state = updateShuttleAddress(state, "returnPickup", address);
    state = updateShuttleAddress(state, "outboundDropoff", null);
    expect(state.values.returnPickup).toBe(address);
    expect(state.values.returnDropoff).toBe(address);
  });

  it("shows reversed required sides as separate outbound and return fields", () => {
    const outboundRoute = { ...SEARCH_RESULT.route,
      from_requires_address: false, to_requires_address: true };
    const returnRoute = { ...SEARCH_RESULT.route, id: "return-route",
      from_requires_address: true, to_requires_address: false };
    const selection = { ...REQUIRED_SELECTION,
      outbound: { ...REQUIRED_SELECTION.outbound, route: outboundRoute },
      returnLeg: { ...REQUIRED_SELECTION.outbound, date: "2026-11-01", route: returnRoute },
    } satisfies ShuttleSelection;
    const root = mount(clientWith(), selection);
    expect(root.querySelector("#shuttle-outbound-dropoff-address")).not.toBeNull();
    expect(root.querySelector("#shuttle-return-pickup-address")).not.toBeNull();
    expect([...root.querySelectorAll(".shuttle-addresses legend")]
      .map((legend) => legend.textContent)).toEqual(["Outbound addresses", "Return addresses"]);
  });
});
