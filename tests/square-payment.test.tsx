import { render } from "preact";
import { act } from "preact/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  ShuttleApiClient,
  TaxiBookingResponse,
  TaxiPriceBreakdownResponse,
  TaxiQuoteResponse,
} from "../src/api/client";
import { ApiError, NetworkError } from "../src/api/errors";
import { bookingFailure } from "../src/app/booking/booking-error";
import { Confirmation } from "../src/app/booking/Confirmation";
import { Confirm } from "../src/app/confirm/Confirm";
import {
  loadSquareSdk,
  squareScriptUrl,
  type SquareApi,
  type SquareCard,
} from "../src/app/confirm/square-sdk";
import { ShuttleConfirm } from "../src/app/shuttle/ShuttleConfirm";
import type { ShuttleSelection } from "../src/app/shuttle/types";
import type { TripFormState } from "../src/app/trip/types";
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

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles", max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false, insurance_pct: "0.00",
    offer_car_seats: true, max_car_seats: 5, car_seat_price: "15.00",
    payment_methods: ["cash"], show_map: true, show_service_dropdown: true,
    terms_and_conditions: "Be ready." },
} satisfies Business;

const CARD_BUSINESS = { ...BUSINESS, payments: { card_available: true,
  environment: "sandbox", square_application_id: "sandbox-app-id",
  square_location_id: "sandbox-location-id" } } satisfies Business;

const TRIP = {
  service: "one_way", pickupDate: "2026-10-30", pickupTime: "10:00",
  returnDate: "2026-10-31", returnTime: "10:00", passengers: 2,
  largeBags: 1, smallBags: 0,
  pickupAddress: { address: "Galveston", zipcode: "77550", location: { lat: 1, lng: 2 } },
  dropoffAddress: { address: "Houston", zipcode: "77002", location: { lat: 3, lng: 4 } },
  pickupAirportId: "", pickupAirportName: "", pickupAirportLocation: null,
  dropoffAirportId: "", dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
} satisfies TripFormState;

const VEHICLE = { vehicle_type_id: "vehicle-1", name: "Sedan", passenger_capacity: 3,
  luggage_capacity: 3, base_price: "90.00", available: true,
  quote_status: "priced" } satisfies QuotedVehicle;
const QUOTE = { out_of_service_area: false, vehicles: [VEHICLE] } satisfies TaxiQuoteResponse;
const BREAKDOWN = { subtotal: "90.00", discount_amount: "0.00", total: "93.00",
  currency: "USD" } satisfies TaxiPriceBreakdownResponse;
const BOOKED = { order_id: "order-1", order_number: "HVT-1", status: "requested",
  total: "93.00", amount_paid: "0.00", payment_method: "online",
  confirmation_email_sent: false } satisfies TaxiBookingResponse;

const SELECTION = { trip: { fromId: ORIGIN_LOCATION.id, toId: DESTINATION_LOCATION.id,
  date: "2026-10-30", returnDate: "2026-11-01", roundTrip: false,
  paxAdult: 1, paxSenior: 1, paxChild: 0 }, from: ORIGIN_LOCATION,
  to: DESTINATION_LOCATION,
  outbound: { kind: "scheduled", date: "2026-10-30", departure: DEPARTURE },
  returnLeg: null } satisfies ShuttleSelection;

const roots: HTMLElement[] = [];

function addRoot(): HTMLElement {
  const root = document.createElement("div");
  document.body.append(root); roots.push(root); return root;
}

function installSquare(card: SquareCard, environment: "sandbox" | "production" = "sandbox") {
  const api: SquareApi = { payments: vi.fn(() => ({ card: vi.fn(async () => card) })) };
  Object.assign(window, { Square: api });
  const script = document.createElement("script");
  script.src = squareScriptUrl(environment); document.head.append(script);
  return api;
}

function chooseCard(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('input[value="online"]');
  if (input === null) throw new Error("Missing Card option");
  act(() => { input.checked = true;
    input.dispatchEvent(new Event("input", { bubbles: true })); });
}

function enter(root: HTMLElement, id: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`Missing ${id}`);
  act(() => { input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true })); });
}

function fillContact(root: HTMLElement): void {
  enter(root, "firstName", "Ada"); enter(root, "lastName", "Lovelace");
  enter(root, "email", "ada@example.com");
  act(() => root.querySelector<HTMLInputElement>(
    '[data-confirm-field="acceptedTerms"]',
  )?.click());
}

function taxiClient(book: ApiClient["book"], priceBreakdown = vi.fn(async () => BREAKDOWN)) {
  return { getBusiness: vi.fn(), getServiceTypes: vi.fn(), getAirports: vi.fn(),
    getAirlines: vi.fn(), quote: vi.fn(), priceBreakdown, book } satisfies ApiClient;
}

function renderTaxi(business: Business, client: ApiClient, vehicle: QuotedVehicle = VEHICLE) {
  const root = addRoot(); const onBooked = vi.fn();
  render(<Confirm business={business} client={client} form={TRIP} onBack={vi.fn()}
    onBooked={onBooked} onVehicleUnavailable={vi.fn()} quote={{ ...QUOTE, vehicles: [vehicle] }}
    serviceName="One Way" vehicle={vehicle} />, root);
  return { onBooked, root };
}

beforeEach(() => {
  document.body.replaceChildren(); roots.length = 0; sessionStorage.clear();
  document.querySelectorAll('script[src*="squarecdn.com"]').forEach((script) => script.remove());
  Reflect.deleteProperty(window, "Square");
});

afterEach(() => {
  for (const root of roots) render(null, root);
  vi.restoreAllMocks();
});

describe("Square SDK loading", () => {
  it("uses Square's exact official URL and loads one script", async () => {
    expect(squareScriptUrl("sandbox")).toBe("https://sandbox.web.squarecdn.com/v1/square.js");
    expect(squareScriptUrl("production")).toBe("https://web.squarecdn.com/v1/square.js");
    const first = loadSquareSdk("sandbox"); const second = loadSquareSdk("sandbox");
    const scripts = document.querySelectorAll<HTMLScriptElement>('script[src*="squarecdn.com"]');
    expect(scripts).toHaveLength(1);
    const api: SquareApi = { payments: vi.fn() };
    Object.assign(window, { Square: api }); scripts[0]?.dispatchEvent(new Event("load"));
    await expect(first).resolves.toBe(api); await expect(second).resolves.toBe(api);
  });

  it("never loads Square for cash-only or Request-a-Quote", async () => {
    renderTaxi(BUSINESS, taxiClient(vi.fn()));
    const manual = { ...VEHICLE, base_price: null,
      quote_status: "request_quote" as const };
    const manualView = renderTaxi(CARD_BUSINESS, taxiClient(vi.fn()), manual);
    await Promise.resolve();
    expect(document.querySelector('script[src*="squarecdn.com"]')).toBeNull();
    expect(manualView.root.querySelector(".payment-method")).toBeNull();
  });
});

describe("taxi card booking", () => {
  it("tokenizes only on valid submit and reuses the key with a new retry token", async () => {
    const tokenize = vi.fn()
      .mockResolvedValueOnce({ status: "OK", token: "token-first" })
      .mockResolvedValueOnce({ status: "OK", token: "token-second" });
    const card = { attach: vi.fn(async () => undefined), tokenize } satisfies SquareCard;
    installSquare(card);
    const book = vi.fn<ApiClient["book"]>()
      .mockRejectedValueOnce(new NetworkError(new Error("offline")))
      .mockResolvedValueOnce(BOOKED);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { onBooked, root } = renderTaxi(CARD_BUSINESS, taxiClient(book));
    chooseCard(root);
    await vi.waitFor(() => expect(card.attach).toHaveBeenCalledWith("#galveston-square-card"));
    expect(tokenize).not.toHaveBeenCalled();
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    expect(tokenize).not.toHaveBeenCalled(); fillContact(root);
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    await vi.waitFor(() => expect(root.textContent).toContain("not be booked twice"));
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(2));
    expect(book.mock.calls.map((call) => call[0].payment)).toEqual([
      { method: "online", payment_method_token: "token-first" },
      { method: "online", payment_method_token: "token-second" },
    ]);
    expect(book.mock.calls[1]?.[1]).toBe(book.mock.calls[0]?.[1]);
    expect(sessionStorage.getItem("galveston-booking-idempotency")).not.toContain("token-");
    expect(consoleError).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(onBooked).toHaveBeenCalledWith(BOOKED, false, "online"));
  });
});

describe("shuttle card booking and confirmation", () => {
  it("sends one tokenized shuttle booking with the selected online method", async () => {
    const card = { attach: vi.fn(async () => undefined),
      tokenize: vi.fn(async () => ({ status: "OK", token: "shuttle-token" })) };
    installSquare(card);
    const bookShuttle = vi.fn<ShuttleApiClient["bookShuttle"]>(async () => SHUTTLE_BOOKED);
    const client = { getBusiness: vi.fn(), getServiceTypes: vi.fn(), getAirports: vi.fn(),
      getAirlines: vi.fn(), quote: vi.fn(), priceBreakdown: vi.fn(), book: vi.fn(),
      getShuttleLocations: vi.fn(async () => LOCATION_GROUPS),
      searchShuttle: vi.fn(async () => SEARCH_RESULT),
      searchShuttleReturn: vi.fn(async () => SEARCH_RESULT),
      quoteShuttle: vi.fn(async () => SHUTTLE_QUOTE), bookShuttle } satisfies ShuttleApiClient;
    const business = { ...SHUTTLE_BUSINESS, payments: CARD_BUSINESS.payments } satisfies Business;
    const root = addRoot(); const onBooked = vi.fn();
    render(<ShuttleConfirm business={business} client={client} quote={SHUTTLE_QUOTE}
      selection={SELECTION} onBack={vi.fn()} onBooked={onBooked} onUnavailable={vi.fn()} />, root);
    chooseCard(root); await vi.waitFor(() => expect(card.attach).toHaveBeenCalledOnce());
    fillContact(root); enter(root, "shuttle-address", "Terminal curb");
    act(() => root.querySelector<HTMLButtonElement>(".create-trip")?.click());
    await vi.waitFor(() => expect(bookShuttle).toHaveBeenCalledOnce());
    expect(bookShuttle.mock.calls[0]?.[0].payment)
      .toEqual({ method: "online", payment_method_token: "shuttle-token" });
    expect(onBooked).toHaveBeenCalledWith(SHUTTLE_BOOKED, "online");
  });

  it("replaces provider decline details with a stable customer-safe message", () => {
    const failure = bookingFailure(new ApiError(402, {
      code: "PAYMENT_FAILED", message: "provider-detail-that-must-not-render",
    }));
    expect(failure.message).toBe(
      "Your card could not be processed. Check the details or try another card.",
    );
    expect(failure.message).not.toContain("provider-detail");
  });

  it("uses the exact processing message and never claims confirmation", () => {
    const root = addRoot();
    render(<Confirmation currency="USD" paymentMethod="online" requestQuote={false}
      response={BOOKED} />, root);
    expect(root.textContent).toContain("Payment processing. You'll get a confirmation email.");
    expect(root.textContent).not.toContain("company will confirm");
    expect(root.textContent).not.toContain("successfully submitted");
  });
});
