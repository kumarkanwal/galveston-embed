import { render } from "preact";
import { act } from "preact/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Business, ShuttleApiClient, ShuttleQuoteResponse } from "../src/api/client";
import { ApiError } from "../src/api/errors";
import { SHUTTLE_UNAVAILABLE_MESSAGE } from "../src/app/shuttle/availability";
import { ShuttleConfirm } from "../src/app/shuttle/ShuttleConfirm";
import type { ShuttleSelection } from "../src/app/shuttle/types";
import {
  DEPARTURE,
  DESTINATION_LOCATION,
  LOCATION_GROUPS,
  ORIGIN_LOCATION,
  PRIVATE_CAR,
  SEARCH_RESULT,
  SHUTTLE_BOOKED,
  SHUTTLE_BUSINESS,
  SHUTTLE_QUOTE,
} from "./shuttle-fixtures";

const SELECTION = {
  trip: {
    fromId: ORIGIN_LOCATION.id,
    toId: DESTINATION_LOCATION.id,
    date: "2026-10-30", returnDate: "2026-11-01", roundTrip: false,
    largeBags: 2, smallBags: 1, paxAdult: 1, paxSenior: 1, paxChild: 0,
  },
  from: ORIGIN_LOCATION,
  to: { ...DESTINATION_LOCATION, requires_address: false },
  outbound: { kind: "scheduled", date: "2026-10-30", departure: DEPARTURE,
    route: { ...SEARCH_RESULT.route, from_requires_address: false,
      to_requires_address: false } },
  returnLeg: null,
} satisfies ShuttleSelection;

const CARD_BUSINESS = {
  ...SHUTTLE_BUSINESS,
  settings: { ...SHUTTLE_BUSINESS.settings, payment_methods: ["cash", "online"] },
  payments: {
    card_available: true,
    environment: "sandbox",
    square_application_id: "sandbox-app-id",
    square_location_id: "sandbox-location-id",
  },
} satisfies Business;

function clientWith(
  quoteShuttle: ShuttleApiClient["quoteShuttle"] = vi.fn(async () => SHUTTLE_QUOTE),
  bookShuttle: ShuttleApiClient["bookShuttle"] = vi.fn(async () => SHUTTLE_BOOKED),
): ShuttleApiClient {
  return {
    getBusiness: vi.fn(async () => SHUTTLE_BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []),
    quote: vi.fn(), priceBreakdown: vi.fn(), book: vi.fn(),
    getShuttleLocations: vi.fn(async () => LOCATION_GROUPS),
    searchShuttle: vi.fn(async () => SEARCH_RESULT),
    searchShuttleReturn: vi.fn(async () => SEARCH_RESULT), quoteShuttle, bookShuttle,
  };
}

function mount(
  client: ShuttleApiClient,
  onUnavailable = vi.fn(),
  business = SHUTTLE_BUSINESS,
  selection: ShuttleSelection = SELECTION,
  quote: ShuttleQuoteResponse = SHUTTLE_QUOTE,
) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<ShuttleConfirm business={business} client={client}
    mapsKey="maps-key" quote={quote} selection={selection} onBack={() => undefined}
    onBooked={() => undefined} onUnavailable={onUnavailable} />, root);
  return { onUnavailable, root };
}

function enter(root: HTMLElement, id: string, value: string) {
  const input = root.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`Missing ${id}`);
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function fill(root: HTMLElement) {
  enter(root, "firstName", "Ada");
  enter(root, "lastName", "Lovelace");
  enter(root, "email", "ada@example.com");
  act(() => {
    root.querySelector<HTMLInputElement>('[data-confirm-field="acceptedTerms"]')?.click();
  });
}

beforeEach(() => document.body.replaceChildren());

describe("round-trip shuttle summary", () => {
  it("shows an arranged time for a date-only private leg", () => {
    const selection = { ...SELECTION, outbound: {
      kind: "private" as const, date: PRIVATE_CAR.service_date, car: PRIVATE_CAR,
      route: SELECTION.outbound.route,
    } };
    const quote = { ...SHUTTLE_QUOTE, legs: [{ ...SHUTTLE_QUOTE.legs[0]!,
      departure_type: "private" as const, schedule_id: null, time: null,
      service_mode: "private" as const,
    }] };
    const { root } = mount(clientWith(), vi.fn(), SHUTTLE_BUSINESS, selection, quote);
    expect(root.textContent).toContain("Outbound: Fri, Oct 30 · Time: to be arranged");
  });

  it("shows the server-returned Bags and Carry-on counts", () => {
    const { root } = mount(clientWith());
    expect(root.querySelector(".shuttle-summary")?.textContent)
      .toContain("Bags: 2 check-in · Carry-on: 1");
  });

  it("shows route, formatted legs, vehicles, passenger mix, and server modes", () => {
    const selection = { ...SELECTION, trip: { ...SELECTION.trip, roundTrip: true },
      returnLeg: { kind: "private" as const, date: PRIVATE_CAR.service_date, car: PRIVATE_CAR,
        route: SELECTION.outbound.route } };
    const quote = { ...SHUTTLE_QUOTE, legs: [
      { ...SHUTTLE_QUOTE.legs[0]!, service_mode: "shared" as const,
        leg_price: "50.00", effective_min_passengers: 1 },
      { ...SHUTTLE_QUOTE.legs[0]!, service_mode: "private" as const,
        leg_price: "150.00", effective_min_passengers: 3 },
    ] };
    const root = document.createElement("div");
    render(<ShuttleConfirm business={SHUTTLE_BUSINESS} client={clientWith()}
      mapsKey="maps-key" quote={quote} selection={selection} onBack={() => undefined}
      onBooked={() => undefined} onUnavailable={() => undefined} />, root);
    const summary = root.querySelector(".shuttle-summary")?.textContent ?? "";
    expect(summary).toContain("Hobby Airport → Cruise Terminal");
    expect(summary).toContain("Outbound: Friday, October 30, 2026 at 9:30 AM");
    expect(summary).toContain("Outbound vehicle: Executive VanType: Shared");
    expect(summary).toContain("Return: Fri, Oct 30 · Time: to be arranged");
    expect(summary).toContain("Return vehicle: Private SUVType: Private");
    expect(summary).toContain("Passengers: 1 adult, 1 senior");
  });
});

describe("shuttle confirmation pricing", () => {
  it("shows B-51 line items in server order, hides exact zero, and shows total", () => {
    const quote = { ...SHUTTLE_QUOTE,
      legs: [
        { ...SHUTTLE_QUOTE.legs[0]!, passenger_lines: [
          { passenger_type: "adult" as const, count: 1,
            unit_price: "18.00", line_total: "18.00" },
          { passenger_type: "senior" as const, count: 1,
            unit_price: "22.00", line_total: "22.00" },
        ], charges: [{ label: "Peak Hours Increase", amount: "5.00",
          kind: "surcharge" as const, included_in_total: true as const }] },
        { ...SHUTTLE_QUOTE.legs[0]!, passenger_lines: [
          { passenger_type: "adult" as const, count: 1,
            unit_price: "40.00", line_total: "40.00" },
          { passenger_type: "senior" as const, count: 1,
            unit_price: "38.00", line_total: "38.00" },
        ], charges: [] },
      ],
      adjustments: [
        { label: "Promo SAVE10", amount: "-8.00", kind: "discount" as const,
          included_in_total: true as const },
        { label: "Card Surcharge", amount: "4.00", kind: "surcharge" as const,
          included_in_total: true as const },
      ], total: "119.00",
      line_items: [
        { label: "Adult Fare", amount: "18.00", kind: "fare", quantity: 1 },
        { label: "Peak Hours Increase", amount: "5.00", kind: "surcharge", quantity: 1 },
        { label: "Card Surcharge", amount: "0.00", kind: "surcharge", quantity: 1 },
        { label: "Promo SAVE10", amount: "-8.00", kind: "discount", quantity: 1 },
      ],
    } satisfies ShuttleQuoteResponse;
    const { root } = mount(clientWith(), vi.fn(), SHUTTLE_BUSINESS, SELECTION, quote);
    const rows = [...root.querySelectorAll(".shuttle-charges .charge-row")];
    expect(rows.map((line) => line.querySelector("span:first-child")?.textContent))
      .toEqual(["Adult Fare", "Peak Hours Increase", "Promo SAVE10"]);
    expect(rows.map((line) => line.querySelector("span:last-child")?.textContent))
      .toEqual(["$18.00 USD", "$5.00 USD", "-$8.00 USD"]);
    expect(root.querySelector(".charges-total")?.textContent).toContain("$119.00 USD");
    expect(root.querySelector(".cash-discount-banner")).toBeNull();
  });

});

describe("shuttle promo and payment pricing", () => {
  it("preserves server line order, labels and amounts while re-quoting promo changes", async () => {
    const discounted = { ...SHUTTLE_QUOTE,
      adjustments: [{ label: "Promo SAVE10", amount: "-7.05", kind: "discount",
        included_in_total: true }],
      line_items: [{ label: "Promo SAVE10", amount: "-7.05", kind: "discount", quantity: 1 }],
      total: "63.45", discount_amount: "7.05",
    } satisfies ShuttleQuoteResponse;
    const quote = vi.fn<ShuttleApiClient["quoteShuttle"]>(async () => discounted);
    const { root } = mount(clientWith(quote));
    const labels = [...root.querySelectorAll(".shuttle-charges .charge-row span:first-child")]
      .map((element) => element.textContent);
    expect(labels).toEqual(["Adult fare", "Senior fare"]);
    expect(root.querySelector(".confirm-form .shuttle-promo #promoCode")).not.toBeNull();
    enter(root, "promoCode", "SAVE10");
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(root.textContent).toContain("$63.45 USD"));
    expect(quote).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: "cash", promo_code: "SAVE10",
    }));
    expect([...root.querySelectorAll(".shuttle-charges .charge-row span:first-child")]
      .map((element) => element.textContent))
      .toEqual(["Promo SAVE10"]);
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(quote).toHaveBeenCalledTimes(2));
    expect(quote.mock.calls[1]?.[0]).not.toHaveProperty("promo_code");
  });

  it("re-quotes online only when public card capability is true", async () => {
    const quote = vi.fn<ShuttleApiClient["quoteShuttle"]>(async () => SHUTTLE_QUOTE);
    const cash = mount(clientWith(quote));
    expect(cash.root.querySelector(".payment-method")).toBeNull();

    const card = mount(clientWith(quote), vi.fn(), CARD_BUSINESS);
    card.root.querySelector<HTMLInputElement>('input[value="online"]')?.click();
    await vi.waitFor(() => expect(quote).toHaveBeenCalledOnce());
    expect(quote.mock.calls[0]?.[0].payment_method).toBe("online");
  });
});

describe("shuttle unavailable payment", () => {
  it("blocks booking with the contact message when no payment method is available", async () => {
    const book = vi.fn<ShuttleApiClient["bookShuttle"]>(async () => SHUTTLE_BOOKED);
    const business = { ...SHUTTLE_BUSINESS, settings: {
      ...SHUTTLE_BUSINESS.settings, payment_methods: [],
    } } satisfies Business;
    const { root } = mount(clientWith(undefined, book), vi.fn(), business);
    expect(root.querySelector(".payment-unavailable")?.textContent).toBe(
      "Online booking is temporarily unavailable. Please contact us to book.",
    );
    expect(root.querySelector<HTMLButtonElement>(".create-trip")?.disabled).toBe(true);
    fill(root);
    act(() => {
      root.querySelector<HTMLFormElement>(".confirm-form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await Promise.resolve();
    expect(book).not.toHaveBeenCalled();
  });
});

describe("shuttle payment pricing race", () => {
  it("keeps the latest method when an older quote finishes last", async () => {
    const resolvers: Array<(quote: ShuttleQuoteResponse) => void> = [];
    const quote = vi.fn(() => new Promise<ShuttleQuoteResponse>((resolve) => {
      resolvers.push(resolve);
    }));
    const { root } = mount(clientWith(quote), vi.fn(), CARD_BUSINESS);
    act(() => root.querySelector<HTMLInputElement>('input[value="online"]')?.click());
    await vi.waitFor(() => expect(quote).toHaveBeenCalledOnce());
    act(() => root.querySelector<HTMLInputElement>('input[value="cash"]')?.click());
    await vi.waitFor(() => expect(quote).toHaveBeenCalledTimes(2));
    resolvers[1]?.({ ...SHUTTLE_QUOTE, total: "69.00" });
    await vi.waitFor(() => expect(root.textContent).toContain("$69.00 USD"));
    resolvers[0]?.({ ...SHUTTLE_QUOTE, total: "99.00" });
    await Promise.resolve();
    expect(root.textContent).not.toContain("$99.00 USD");
  });
});

describe("shuttle availability errors", () => {
  it.each([
    [409, "SEATS_UNAVAILABLE", "Those seats were just booked."],
    [422, "SCHEDULE_INACTIVE", "That departure is no longer active."],
    [404, "NOT_FOUND", "That route was removed."],
  ])("returns %s %s to Departures without retrying", async (status, code, message) => {
    const book = vi.fn<ShuttleApiClient["bookShuttle"]>(async () => {
      throw new ApiError(status, { code, message });
    });
    const { onUnavailable, root } = mount(clientWith(undefined, book));
    fill(root);
    act(() => {
      root.querySelector<HTMLFormElement>(".confirm-form")
        ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await vi.waitFor(() => expect(onUnavailable).toHaveBeenCalledWith(SHUTTLE_UNAVAILABLE_MESSAGE));
    expect(book).toHaveBeenCalledOnce();
  });
});
