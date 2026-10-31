import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShuttleApiClient, ShuttleDeparture, ShuttleReturnQuery } from "../src/api/client";
import { ApiError } from "../src/api/errors";
import { SHUTTLE_UNAVAILABLE_MESSAGE } from "../src/app/shuttle/availability";
import { ShuttleFlow } from "../src/app/shuttle/ShuttleFlow";
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

function clientWith(departures = [DEPARTURE]) {
  const searchShuttleReturn = vi.fn(async (query: ShuttleReturnQuery) => {
    const suffix = query.outbound_schedule_id === DEPARTURE.schedule_id ? "first" : "second";
    return { ...SEARCH_RESULT, departures: [{ ...DEPARTURE,
      schedule_id: `aaaaaaaa-aaaa-aaaa-aaaa-${suffix === "first" ? "aaaaaaaaaaaa" : "bbbbbbbbbbbb"}`,
      service_label: `Return for ${suffix}` }] };
  });
  const client = {
    getBusiness: vi.fn(async () => SHUTTLE_BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []), quote: vi.fn(),
    priceBreakdown: vi.fn(), book: vi.fn(),
    getShuttleLocations: vi.fn(async (exclude?: string) =>
      exclude === undefined ? LOCATION_GROUPS : LOCATION_GROUPS.slice(1)),
    searchShuttle: vi.fn(async () => ({ ...SEARCH_RESULT, departures })),
    searchShuttleReturn, quoteShuttle: vi.fn(async () => SHUTTLE_QUOTE),
    bookShuttle: vi.fn(async () => SHUTTLE_BOOKED),
  } satisfies ShuttleApiClient;
  return { client, searchShuttleReturn };
}

function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  act(() => {
    element.value = value;
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? "change" : "input",
      { bubbles: true }));
  });
}

async function fillTrip(root: HTMLElement, roundTrip: boolean) {
  await vi.waitFor(() => expect(root.querySelectorAll("#fromId option").length).toBeGreaterThan(1));
  change(root.querySelector<HTMLSelectElement>("#fromId")!, ORIGIN_LOCATION.id);
  await vi.waitFor(() => expect(root.querySelectorAll("#toId option").length).toBeGreaterThan(1));
  change(root.querySelector<HTMLSelectElement>("#toId")!, DESTINATION_LOCATION.id);
  if (roundTrip) {
    act(() => root.querySelector<HTMLInputElement>('.trip-kind input')?.click());
    const date = root.querySelector<HTMLInputElement>("#date")?.value ?? "";
    change(root.querySelector<HTMLInputElement>("#returnDate")!, date);
  }
  act(() => {
    root.querySelector<HTMLFormElement>(".shuttle-trip")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await vi.waitFor(() => expect(root.textContent).toContain("Choose Departure"));
}

function mount(client: ShuttleApiClient) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<ShuttleFlow business={SHUTTLE_BUSINESS} client={client} mapsKey="maps-key" />, root);
  return root;
}

beforeEach(() => document.body.replaceChildren());

describe("same-page shuttle departures", () => {
  it("keeps outbound departures above returns and refreshes returns for a new outbound", async () => {
    const second = { ...DEPARTURE,
      schedule_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", start_time: "11:30",
    } satisfies ShuttleDeparture;
    const { client, searchShuttleReturn } = clientWith([DEPARTURE, second]);
    const root = mount(client);
    await fillTrip(root, true);
    expect(root.querySelector(".departure-section.return")).toBeNull();

    act(() => root.querySelectorAll<HTMLButtonElement>(".departure-section.outbound button")[0]?.click());
    await vi.waitFor(() => expect(root.textContent).toContain("Return for first"));
    expect(root.querySelector(".departure-section.outbound")).not.toBeNull();
    expect(root.querySelector(".departure-section.return")).not.toBeNull();

    act(() => root.querySelectorAll<HTMLButtonElement>(".departure-section.outbound button")[1]?.click());
    await vi.waitFor(() => expect(searchShuttleReturn).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(root.textContent).toContain("Return for second"));
    expect(root.textContent).not.toContain("Return for first");
    expect(client.quoteShuttle).not.toHaveBeenCalled();
  });

  it("shows no return section or return search for a one-way trip", async () => {
    const { client, searchShuttleReturn } = clientWith();
    const root = mount(client);
    await fillTrip(root, false);
    expect(root.querySelector(".departure-section.return")).toBeNull();
    expect(root.textContent).not.toContain("Choose Return");
    expect(searchShuttleReturn).not.toHaveBeenCalled();
  });

  it("refreshes Departures and clears a remembered route after not found", async () => {
    const { client } = clientWith();
    client.quoteShuttle = vi.fn(async () => {
      throw new ApiError(404, { code: "NOT_FOUND", message: "Route removed." });
    });
    const root = mount(client);
    await fillTrip(root, false);
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
    await vi.waitFor(() => expect(client.searchShuttle).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(root.textContent).toContain(SHUTTLE_UNAVAILABLE_MESSAGE));
    expect(root.textContent).toContain("Choose Departure");
    expect(root.textContent).not.toContain("Trip Summary");
  });

});

describe("minimum and private date refresh", () => {
  it("keeps inputs and shows the server minimum error without retrying", async () => {
    const { client } = clientWith();
    client.quoteShuttle = vi.fn(async () => {
      throw new ApiError(422, { code: "MIN_PASSENGERS_NOT_MET",
        message: "At least 3 passengers are required for this trip." });
    });
    const root = mount(client);
    await fillTrip(root, false);
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
    await vi.waitFor(() => expect(root.textContent)
      .toContain("At least 3 passengers are required for this trip."));
    expect(root.textContent).toContain("Choose Departure");
    expect(client.quoteShuttle).toHaveBeenCalledOnce();
  });

  it("rechecks private availability when its pickup date changes", async () => {
    const { client } = clientWith([]);
    const option = {
      departure_type: "on_request" as const, route_id: SEARCH_RESULT.route.id,
      vehicle_type_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      vehicle_type_name: "Private Van", seat_capacity: 6, from_price: "150.00",
      effective_min_passengers: 2, service_mode: "private" as const,
      pricing: { mode: "fixed_vehicle" as const, tiers: [], fixed_price: "150.00" },
    };
    client.searchShuttle = vi.fn(async () => ({ ...SEARCH_RESULT, departures: [],
      on_request: null, on_request_options: [option] }));
    const root = mount(client);
    await fillTrip(root, false);
    change(root.querySelector<HTMLInputElement>('[data-shuttle-date="outbound"]')!, "2026-11-03");
    await vi.waitFor(() => expect(client.searchShuttle).toHaveBeenCalledTimes(2));
    expect(client.searchShuttle).toHaveBeenLastCalledWith(expect.objectContaining({
      date: "2026-11-03",
    }));
  });
});
