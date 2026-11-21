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
  const client: ShuttleApiClient = {
    getBusiness: vi.fn(async () => SHUTTLE_BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []), quote: vi.fn(),
    priceBreakdown: vi.fn(), book: vi.fn(),
    getShuttleLocations: vi.fn(async (exclude?: string) =>
      exclude === undefined ? LOCATION_GROUPS : LOCATION_GROUPS.slice(1)),
    searchShuttle: vi.fn(async () => ({ ...SEARCH_RESULT, departures })),
    searchShuttleReturn, quoteShuttle: vi.fn(async () => SHUTTLE_QUOTE),
    bookShuttle: vi.fn(async () => SHUTTLE_BOOKED),
  };
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

function enterPickup(root: HTMLElement, id: string, value: string) {
  change(root.querySelector<HTMLInputElement>(`#${id}`)!, value);
}

function submitConfirm(root: HTMLElement) {
  act(() => {
    root.querySelector<HTMLFormElement>(".confirm-form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

async function openOneWayConfirm(root: HTMLElement) {
  await fillTrip(root, false);
  act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
  act(() => root.querySelector<HTMLButtonElement>(".departure-continue")?.click());
  await vi.waitFor(() => expect(root.querySelector("#outbound-pickup-time")).not.toBeNull());
}

function fillConfirmContact(root: HTMLElement) {
  change(root.querySelector<HTMLInputElement>("#firstName")!, "Ada");
  change(root.querySelector<HTMLInputElement>("#lastName")!, "Lovelace");
  change(root.querySelector<HTMLInputElement>("#email")!, "ada@example.com");
  act(() => root.querySelector<HTMLInputElement>(
    '[data-confirm-field="acceptedTerms"]')?.click());
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  document.body.replaceChildren();
  scrollIntoView.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
});

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
    expect(client.searchShuttle).toHaveBeenCalledWith(expect.objectContaining({
      trip_type: "round_trip", pax_adult: 1, pax_senior: 0, pax_child: 0,
    }));
    expect(root.querySelector(".departure-section.return")).toBeNull();

    act(() => root.querySelectorAll<HTMLButtonElement>(".departure-section.outbound button")[0]?.click());
    await vi.waitFor(() => expect(root.querySelector(".departure-section.return")).not.toBeNull());
    expect(scrollIntoView).toHaveBeenCalledOnce();
    expect(root.querySelector(".departure-continue")).toBeNull();
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
});

describe("departure Continue flow", () => {
  it("quotes once and opens Confirm with pickup time below Email", async () => {
    const { client, searchShuttleReturn } = clientWith();
    const root = mount(client);
    await fillTrip(root, false);
    expect(client.searchShuttle).toHaveBeenCalledWith(expect.objectContaining({
      trip_type: "one_way",
    }));
    expect(root.querySelector(".departure-section.return")).toBeNull();
    expect(root.textContent).not.toContain("Choose Return");
    expect(searchShuttleReturn).not.toHaveBeenCalled();
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
    await vi.waitFor(() => expect(root.querySelector(".departure-continue")).not.toBeNull());
    expect(client.quoteShuttle).not.toHaveBeenCalled();
    act(() => root.querySelector<HTMLButtonElement>(".departure-continue")?.click());
    await vi.waitFor(() => expect(root.querySelector("#outbound-pickup-time")).not.toBeNull());
    expect(client.quoteShuttle).toHaveBeenCalledOnce();
    expect(client.quoteShuttle).toHaveBeenCalledWith(expect.objectContaining({
      legs: [expect.not.objectContaining({ requested_pickup_time: expect.anything() })],
    }));
    expect(root.querySelector<HTMLInputElement>("#outbound-pickup-time")?.hasAttribute("step"))
      .toBe(false);
    expect(root.textContent).toContain("We'll call you to confirm your pickup time.");
    expect(root.textContent).not.toContain("Tell us when you would like to be picked up.");
    expect(root.textContent).not.toContain("Check price");
    const emailField = root.querySelector("#email")?.closest(".field");
    expect(emailField?.nextElementSibling?.querySelector("#outbound-pickup-time")).not.toBeNull();
    expect(root.textContent).toContain("Pickup time: —");
    fillConfirmContact(root);
    submitConfirm(root);
    expect(root.textContent).toContain("Enter a pickup time.");
    expect(client.bookShuttle).not.toHaveBeenCalled();
    enterPickup(root, "outbound-pickup-time", "10:10");
    expect(root.textContent).toContain("Pickup time: 10:10 AM");
  });
});

describe("round-trip pickup times", () => {
  it("shows Continue after both round-trip legs and advances on click", async () => {
    const { client } = clientWith();
    const root = mount(client);
    await fillTrip(root, true);
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
    await vi.waitFor(() => expect(root.querySelector(".departure-section.return")).not.toBeNull());
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.return button")?.click());
    await vi.waitFor(() => expect(root.querySelector(".departure-continue")).not.toBeNull());
    expect(client.quoteShuttle).not.toHaveBeenCalled();
    act(() => root.querySelector<HTMLButtonElement>(".departure-continue")?.click());
    await vi.waitFor(() => expect(root.querySelectorAll('input[type="time"]')).toHaveLength(2));
    expect(root.querySelector('label[for="outbound-pickup-time"]')?.textContent).toBe("Pickup time");
    expect(root.querySelector('label[for="return-pickup-time"]')?.textContent)
      .toBe("Return pickup time");
    expect(root.textContent).toContain("Pickup time: —");
    expect(root.textContent).toContain("Return pickup time: —");
    enterPickup(root, "outbound-pickup-time", "10:30");
    enterPickup(root, "return-pickup-time", "14:45");
    await vi.waitFor(() => expect(client.quoteShuttle).toHaveBeenCalledOnce());
    expect(root.textContent).toContain("Pickup time: 10:30 AM");
    expect(root.textContent).toContain("Return pickup time: 2:45 PM");
    expect(client.quoteShuttle).toHaveBeenCalledWith(expect.objectContaining({
      legs: [
        expect.not.objectContaining({ requested_pickup_time: expect.anything() }),
        expect.not.objectContaining({ requested_pickup_time: expect.anything() }),
      ],
    }));
  });
});

describe("pickup time quote errors", () => {
  it("maps a promo re-quote 422 error to the matching pickup field", async () => {
    const { client } = clientWith();
    client.quoteShuttle = vi.fn()
      .mockResolvedValueOnce(SHUTTLE_QUOTE)
      .mockRejectedValueOnce(new ApiError(422, { code: "INVALID_PICKUP_TIME",
        field: "legs.0.requested_pickup_time", message: "Choose another pickup time." }));
    const root = mount(client);
    await openOneWayConfirm(root);
    enterPickup(root, "outbound-pickup-time", "10:30");
    change(root.querySelector<HTMLInputElement>("#promoCode")!, "SAVE10");
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(root.querySelector("#outbound-pickup-time-error")?.textContent)
      .toBe("Choose another pickup time."));
    expect(client.quoteShuttle).toHaveBeenCalledTimes(2);
  });
});

describe("pickup time booking", () => {
  it("sends the selected time and shows it on the success screen", async () => {
    const { client } = clientWith();
    client.searchShuttle = vi.fn(async () => ({ ...SEARCH_RESULT, route: {
      ...SEARCH_RESULT.route, from_requires_address: false, to_requires_address: false,
    } }));
    const root = mount(client);
    await openOneWayConfirm(root);
    enterPickup(root, "outbound-pickup-time", "10:30");
    fillConfirmContact(root);
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    await vi.waitFor(() => expect(client.bookShuttle).toHaveBeenCalledOnce());
    expect(client.bookShuttle).toHaveBeenCalledWith(expect.objectContaining({
      legs: [expect.objectContaining({ requested_pickup_time: "10:30" })],
    }), expect.any(String));
    await vi.waitFor(() => expect(root.textContent).toContain("Confirmation"));
    expect(root.textContent).toContain("Outbound: Sat, Nov 21, 2026 · 9:30 AM");
    expect(root.textContent).toContain("Pickup time: 10:30 AM");
  });
});

describe("pickup time booking errors", () => {
  it("returns a booking 422 pickup-time error to the Step 3 field", async () => {
    const { client } = clientWith();
    client.searchShuttle = vi.fn(async () => ({ ...SEARCH_RESULT, route: {
      ...SEARCH_RESULT.route, from_requires_address: false, to_requires_address: false,
    } }));
    client.bookShuttle = vi.fn(async () => {
      throw new ApiError(422, { code: "INVALID_PICKUP_TIME",
        field: "legs.0.requested_pickup_time", message: "Pickup time is unavailable." });
    });
    const root = mount(client);
    await openOneWayConfirm(root);
    enterPickup(root, "outbound-pickup-time", "10:30");
    fillConfirmContact(root);
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    await vi.waitFor(() => expect(root.querySelector("#outbound-pickup-time-error")?.textContent)
      .toBe("Pickup time is unavailable."));
  });
});

describe("stale shuttle availability", () => {
  it("refreshes Departures and clears a remembered route after not found", async () => {
    const { client } = clientWith();
    client.quoteShuttle = vi.fn(async () => {
      throw new ApiError(404, { code: "NOT_FOUND", message: "Route removed." });
    });
    const root = mount(client);
    await fillTrip(root, false);
    act(() => root.querySelector<HTMLButtonElement>(".departure-section.outbound button")?.click());
    await vi.waitFor(() => expect(root.querySelector(".departure-continue")).not.toBeNull());
    act(() => root.querySelector<HTMLButtonElement>(".departure-continue")?.click());
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
    await vi.waitFor(() => expect(root.querySelector(".departure-continue")).not.toBeNull());
    act(() => root.querySelector<HTMLButtonElement>(".departure-continue")?.click());
    await vi.waitFor(() => expect(root.textContent)
      .toContain("At least 3 passengers are required for this trip."));
    expect(root.textContent).toContain("Choose Departure");
    expect(client.quoteShuttle).toHaveBeenCalledOnce();
  });

});
