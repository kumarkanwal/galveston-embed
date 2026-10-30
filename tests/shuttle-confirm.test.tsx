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
    paxAdult: 1, paxSenior: 1, paxChild: 0,
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
) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<ShuttleConfirm business={business} client={client}
    mapsKey="maps-key" quote={SHUTTLE_QUOTE} selection={SELECTION} onBack={() => undefined}
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

describe("shuttle confirmation pricing", () => {
  it("preserves server line order, labels and amounts while re-quoting promo changes", async () => {
    const discounted = { ...SHUTTLE_QUOTE,
      line_items: [
        { label: "Promo SAVE10", amount: "-7.05", kind: "discount", quantity: 1 },
        ...(SHUTTLE_QUOTE.line_items ?? []),
      ], total: "63.45", discount_amount: "7.05",
    } satisfies ShuttleQuoteResponse;
    const quote = vi.fn<ShuttleApiClient["quoteShuttle"]>(async () => discounted);
    const { root } = mount(clientWith(quote));
    const labels = [...root.querySelectorAll(".charge-row span:first-child")]
      .map((element) => element.textContent);
    expect(labels).toEqual(["Adult fare", "Senior fare"]);
    enter(root, "promoCode", "SAVE10");
    act(() => root.querySelector<HTMLButtonElement>(".promo-code button")?.click());
    await vi.waitFor(() => expect(root.textContent).toContain("$63.45 USD"));
    expect(quote).toHaveBeenCalledWith(expect.objectContaining({
      payment_method: "cash", promo_code: "SAVE10",
    }));
    expect([...root.querySelectorAll(".charge-row span:first-child")]
      .map((element) => element.textContent))
      .toEqual(["Promo SAVE10", "Adult fare", "Senior fare"]);
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
