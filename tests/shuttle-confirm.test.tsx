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

const DISCOUNT_QUOTE = {
  ...SHUTTLE_QUOTE,
  total: "55.50",
  totals_by_payment_method: {
    cash: { adjustments: [
      { label: "Cash discount (15%)", amount: "-15.00", kind: "discount" as const,
        included_in_total: true as const },
    ], total: "55.50" },
    online: { adjustments: [
      { label: "CC Surcharge", amount: "2.12", kind: "surcharge" as const,
        included_in_total: true as const },
    ], total: "72.62" },
  },
  cash_discount: { enabled: true, percent: "15.00",
    note: "Save when you pay the driver", savings_amount: "15.00" },
} satisfies ShuttleQuoteResponse;

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

function adjustmentLabels(root: HTMLElement) {
  return [...root.querySelectorAll(".shuttle-adjustment span:first-child")]
    .map((element) => element.textContent);
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
    expect([...root.querySelectorAll(".shuttle-summary .confirm-icon")]
      .map((icon) => icon.getAttribute("data-confirm-icon")))
      .toEqual(["route", "calendar", "vehicle", "calendar", "vehicle", "person", "luggage"]);
    expect(root.querySelectorAll(".shuttle-summary svg[aria-hidden='true']")).toHaveLength(7);
    expect(summary).not.toMatch(/[▣▰●]/);
  });
});

describe("shuttle confirmation pricing", () => {
  it("switches exact B-55 method adjustments and totals without client math", () => {
    const quote = { ...DISCOUNT_QUOTE,
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
        { label: "Cash discount (15%)", amount: "-15.00", kind: "discount" as const,
          included_in_total: true as const },
      ],
    } satisfies ShuttleQuoteResponse;
    const client = clientWith();
    const { root } = mount(client, vi.fn(), CARD_BUSINESS, SELECTION, quote);
    expect([...root.querySelectorAll(".shuttle-passenger-line")]
      .map((line) => line.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "Outbound: Adult × 1 $18.00 USD · Senior × 1 $22.00 USD",
      "Return: Adult × 1 $40.00 USD · Senior × 1 $38.00 USD",
    ]);
    expect(adjustmentLabels(root)).toEqual(["Cash discount (15%)"]);
    expect(root.querySelector(".charges-total")?.textContent).toContain("$55.50 USD");
    act(() => root.querySelector<HTMLInputElement>('input[value="online"]')?.click());
    expect(adjustmentLabels(root)).toEqual(["CC Surcharge"]);
    expect(root.querySelector(".charges-total")?.textContent).toContain("$72.62 USD");
    expect(client.quoteShuttle).not.toHaveBeenCalled();
  });

  it("renders the server cash banner and method-card badges", () => {
    const { root } = mount(clientWith(), vi.fn(), CARD_BUSINESS, SELECTION, DISCOUNT_QUOTE);
    const banner = root.querySelector(".cash-discount-banner")?.textContent ?? "";
    expect(banner).toContain("Save 15.00% with Cash!");
    expect(banner).toContain("Save when you pay the driver");
    expect(banner).toContain("You Save$15.00 USD");
    expect(root.querySelector(".payment-card-badge.recommended")?.textContent)
      .toBe("Recommended — save 15.00%");
    expect(root.querySelector(".payment-card-badge.standard")?.textContent)
      .toBe("Standard price");
  });
});

describe("shuttle promo and payment pricing", () => {
  it("preserves server line order, labels and amounts while re-quoting promo changes", async () => {
    const discounted = { ...SHUTTLE_QUOTE,
      adjustments: [{ label: "Promo SAVE10", amount: "-7.05", kind: "discount",
        included_in_total: true }],
      line_items: [{ label: "Promo SAVE10", amount: "-7.05", kind: "discount", quantity: 1 }],
      totals_by_payment_method: {
        cash: { adjustments: [{ label: "Promo SAVE10", amount: "-7.05",
          kind: "discount" as const, included_in_total: true as const }], total: "63.45" },
        online: { adjustments: [{ label: "Promo SAVE10", amount: "-7.05",
          kind: "discount" as const, included_in_total: true as const }], total: "65.35" },
      },
      cash_discount: { enabled: true, percent: "15.00",
        note: "Updated cash saving", savings_amount: "8.50" },
      total: "63.45", discount_amount: "7.05",
    } satisfies ShuttleQuoteResponse;
    const quote = vi.fn<ShuttleApiClient["quoteShuttle"]>(async () => discounted);
    const { root } = mount(clientWith(quote), vi.fn(), CARD_BUSINESS);
    act(() => root.querySelector<HTMLInputElement>('input[value="online"]')?.click());
    expect(adjustmentLabels(root)).toEqual([]);
    expect(root.querySelector(".confirm-form .shuttle-promo #promoCode")).not.toBeNull();
    enter(root, "promoCode", "SAVE10");
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(root.textContent).toContain("$65.35 USD"));
    expect(quote).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: "online", promo_code: "SAVE10",
    }));
    expect(adjustmentLabels(root)).toEqual(["Promo SAVE10"]);
    expect(root.querySelector(".charges-total")?.textContent).toContain("$65.35 USD");
    expect(root.querySelector(".cash-discount-banner")?.textContent)
      .toContain("Updated cash savingYou Save$8.50 USD");
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(quote).toHaveBeenCalledTimes(2));
    expect(quote.mock.calls[1]?.[0]).not.toHaveProperty("promo_code");
  });

  it("switches online locally only when public card capability is true", () => {
    const quote = vi.fn<ShuttleApiClient["quoteShuttle"]>(async () => SHUTTLE_QUOTE);
    const cash = mount(clientWith(quote));
    expect(cash.root.querySelector(".payment-method")).toBeNull();

    const card = mount(clientWith(quote), vi.fn(), CARD_BUSINESS, SELECTION, DISCOUNT_QUOTE);
    act(() => card.root.querySelector<HTMLInputElement>('input[value="online"]')?.click());
    expect(quote).not.toHaveBeenCalled();
    expect(card.root.querySelector(".charges-total")?.textContent).toContain("$72.62 USD");
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
