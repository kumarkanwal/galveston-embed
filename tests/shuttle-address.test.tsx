import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LocationOption, ShuttleApiClient } from "../src/api/client";
import { addressAfterRouteChange } from "../src/app/shuttle/address";
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
  outbound: { kind: "scheduled", date: "2026-10-30", departure: DEPARTURE },
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
  it("shows the field only for locations that require an address", () => {
    expect(mount(clientWith()).querySelector("#shuttle-address")).not.toBeNull();
    const optionalTo = { ...DESTINATION_LOCATION, requires_address: false } satisfies LocationOption;
    const optional = { ...REQUIRED_SELECTION, to: optionalTo } satisfies ShuttleSelection;
    expect(mount(clientWith(), optional).querySelector("#shuttle-address")).toBeNull();
  });

  it("blocks booking when typed text was not selected from Places", async () => {
    const book = vi.fn<ShuttleApiClient["bookShuttle"]>(async () => SHUTTLE_BOOKED);
    const root = mount(clientWith(book)); fillContact(root);
    enter(root, "shuttle-address", "A"); submit(root);
    await vi.waitFor(() => expect(root.textContent)
      .toContain("Choose a street address or airport for this trip."));
    expect(book).not.toHaveBeenCalled();
  });

  it("clears a selected precise address when From or To changes", () => {
    const address = { address: "2021 Strand St, Galveston, TX 77550", zipcode: "77550",
      location: { lat: 29.3, lng: -94.8 } };
    expect(addressAfterRouteChange(address, "from-1:to-1", "from-1:to-1")).toBe(address);
    expect(addressAfterRouteChange(address, "from-1:to-1", "from-2:to-1")).toBeNull();
    expect(addressAfterRouteChange(address, "from-1:to-1", "from-1:to-2")).toBeNull();
  });
});
