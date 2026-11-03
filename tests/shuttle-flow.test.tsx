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

async function fillTrip(root: HTMLElement, roundTrip: boolean, returnDate?: string) {
  await vi.waitFor(() => expect(root.querySelector<HTMLInputElement>("#fromId")?.disabled)
    .toBe(false));
  const from = root.querySelector<HTMLInputElement>("#fromId")!;
  act(() => { from.focus(); from.value = ORIGIN_LOCATION.name;
    from.dispatchEvent(new Event("input", { bubbles: true })); });
  await vi.waitFor(() => expect(root.querySelector(
    `[data-location-id="${ORIGIN_LOCATION.id}"]`)).not.toBeNull());
  act(() => root.querySelector<HTMLButtonElement>(
    `[data-location-id="${ORIGIN_LOCATION.id}"]`)?.click());
  await vi.waitFor(() => expect(root.querySelector<HTMLInputElement>("#toId")?.disabled)
    .toBe(false));
  const to = root.querySelector<HTMLInputElement>("#toId")!;
  act(() => { to.focus(); to.value = DESTINATION_LOCATION.name;
    to.dispatchEvent(new Event("input", { bubbles: true })); });
  await vi.waitFor(() => expect(root.querySelector(
    `[data-location-id="${DESTINATION_LOCATION.id}"]`)).not.toBeNull());
  act(() => root.querySelector<HTMLButtonElement>(
    `[data-location-id="${DESTINATION_LOCATION.id}"]`)?.click());
  const tripDate = root.querySelector<HTMLInputElement>("#date")?.value ?? "";
  if (roundTrip) {
    act(() => root.querySelector<HTMLInputElement>('.trip-kind input')?.click());
    change(root.querySelector<HTMLInputElement>("#returnDate")!, returnDate ?? tripDate);
  }
  act(() => {
    root.querySelector<HTMLFormElement>(".shuttle-trip")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await vi.waitFor(() => expect(root.textContent).toContain("Choose Departure"));
  return tripDate;
}

function mount(client: ShuttleApiClient) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<ShuttleFlow business={SHUTTLE_BUSINESS} client={client} mapsKey="maps-key" />, root);
  return root;
}

beforeEach(() => document.body.replaceChildren());

describe("conditional shuttle return date", () => {
  it("clears and disables Return Date when Round trip is unchecked", async () => {
    const { client } = clientWith();
    const root = mount(client);
    const checkbox = root.querySelector<HTMLInputElement>(".trip-kind input");
    act(() => checkbox?.click());
    const returnDate = root.querySelector<HTMLInputElement>("#returnDate");
    change(returnDate!, "2026-11-08");
    expect(returnDate?.value).toBe("2026-11-08");
    act(() => checkbox?.click());
    await vi.waitFor(() => expect(returnDate?.value).toBe(""));
    expect(returnDate?.disabled).toBe(true);
    expect(returnDate?.closest(".return-date-slot")?.getAttribute("aria-hidden")).toBe("true");
    expect(client.searchShuttle).not.toHaveBeenCalled();
  });
});

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
    await vi.waitFor(() => expect(root.querySelector(".departure-section.return")).not.toBeNull());
    expect(searchShuttleReturn).toHaveBeenLastCalledWith(expect.objectContaining(
      { outbound_schedule_id: DEPARTURE.schedule_id },
    ));
    expect(root.textContent).not.toContain("Return for first");

    act(() => root.querySelectorAll<HTMLButtonElement>(".departure-section.outbound button")[1]?.click());
    await vi.waitFor(() => expect(searchShuttleReturn).toHaveBeenCalledTimes(2));
    expect(searchShuttleReturn).toHaveBeenLastCalledWith(expect.objectContaining(
      { outbound_schedule_id: second.schedule_id },
    ));
    expect(root.textContent).not.toContain("Return for second");
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

describe("shuttle passenger validation", () => {
  it("blocks a zero-passenger search with the passenger error", async () => {
    const { client } = clientWith();
    const root = mount(client);
    await fillTrip(root, false);
    act(() => root.querySelector<HTMLButtonElement>(".back-button")?.click());
    act(() => root.querySelector<HTMLButtonElement>(".passenger-trigger")?.click());
    act(() => root.querySelector<HTMLButtonElement>('[aria-label="Decrease Adults"]')?.click());
    act(() => {
      root.querySelector<HTMLFormElement>(".shuttle-trip")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await vi.waitFor(() => expect(root.textContent).toContain("Select at least 1 passenger"));
    expect(client.searchShuttle).toHaveBeenCalledOnce();
  });
});

describe("shuttle minimum handling", () => {
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

});
