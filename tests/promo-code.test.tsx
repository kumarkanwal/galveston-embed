import { render } from "preact";
import { beforeEach, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiBookingResponse,
  TaxiPriceBreakdownResponse,
  TaxiQuoteResponse,
} from "../src/api/client";
import { ApiError } from "../src/api/errors";
import { Confirm } from "../src/app/confirm/Confirm";
import type { TripFormState } from "../src/app/trip/types";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles", emails_enabled: false,
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false,
    insurance_pct: "0.00", offer_car_seats: true, max_car_seats: 2,
    car_seat_price: "15.00", payment_methods: ["cash"],
    show_map: true, show_service_dropdown: true,
    terms_and_conditions: null },
} satisfies Business;

const TRIP: TripFormState = {
  service: "one_way", pickupDate: "2026-10-19", pickupTime: "09:30",
  returnDate: "2026-10-20", returnTime: "09:30",
  passengers: 1, largeBags: 0, smallBags: 0,
  pickupAddress: { address: "Houston, TX", zipcode: "77002", location: { lat: 1, lng: 2 } },
  dropoffAddress: { address: "Galveston, TX", zipcode: "77550", location: { lat: 3, lng: 4 } },
  pickupAirportId: "", pickupAirportName: "", pickupAirportLocation: null,
  dropoffAirportId: "", dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
};

const VEHICLE = {
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  name: "Sedan", passenger_capacity: 3, luggage_capacity: 3,
  photo_url: null, base_price: "90.00", pricing_basis: "distance",
  available: true, quote_status: "priced",
} satisfies QuotedVehicle;

const REQUEST_QUOTE = {
  ...VEHICLE, base_price: null, pricing_basis: null, quote_status: "request_quote",
} satisfies QuotedVehicle;

const QUOTE = {
  distance_miles: "31.29", duration_minutes: 50, route_polyline: "route",
  out_of_service_area: false, vehicles: [VEHICLE],
} satisfies TaxiQuoteResponse;

const NORMAL: TaxiPriceBreakdownResponse = {
  line_items: [
    { label: "Base", amount: "90.00", kind: "base", quantity: 1 },
    { label: "Fuel Surcharge", amount: "2.70", kind: "surcharge", quantity: 1 },
  ],
  subtotal: "92.70", discount_amount: "0.00", total: "92.70", currency: "USD",
};

const DISCOUNTED: TaxiPriceBreakdownResponse = {
  ...NORMAL,
  line_items: [
    ...NORMAL.line_items ?? [],
    { label: "Promo SAVE10", amount: "-9.00", kind: "discount", quantity: 1 },
  ],
  subtotal: "83.70", discount_amount: "9.00", total: "83.70",
};

const TRACKED: TaxiPriceBreakdownResponse = {
  ...NORMAL,
  line_items: [
    ...NORMAL.line_items ?? [],
    { label: "Promo HOTELREF", amount: "0.00", kind: "discount", quantity: 1 },
  ],
};

const BOOKED: TaxiBookingResponse = {
  order_id: "order-1", order_number: "HVT-1", status: "requested",
  total: "83.70", amount_paid: "0.00", payment_method: "cash",
  confirmation_email_sent: false,
};

function clientWith(
  priceBreakdown: ApiClient["priceBreakdown"],
  book: ApiClient["book"] = vi.fn(async () => BOOKED),
): ApiClient {
  return {
    getBusiness: vi.fn(async () => BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []),
    quote: vi.fn(async () => QUOTE), priceBreakdown, book,
  };
}

function mount(client: ApiClient, vehicle: QuotedVehicle = VEHICLE) {
  const root = document.createElement("div");
  document.body.append(root);
  render(<Confirm business={BUSINESS} client={client} form={TRIP}
    onBack={() => undefined} onBooked={() => undefined} quote={{ ...QUOTE, vehicles: [vehicle] }}
    onVehicleUnavailable={() => undefined}
    serviceName="One Way Transfer" vehicle={vehicle} />, root);
  return root;
}

function setInput(root: HTMLElement, id: string, value: string) {
  const field = root.querySelector<HTMLInputElement>(`#${id}`);
  if (field === null) throw new Error(`Missing ${id}`);
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

function promoButton(root: HTMLElement) {
  const button = root.querySelector<HTMLButtonElement>(".promo-code button");
  if (button === null) throw new Error("Missing promo button");
  return button;
}

async function applyCode(root: HTMLElement, code: string) {
  setInput(root, "promoCode", code);
  await vi.waitFor(() => expect(promoButton(root).disabled).toBe(false));
  promoButton(root).click();
}

async function fillAndSubmit(root: HTMLElement) {
  setInput(root, "firstName", "Ada");
  setInput(root, "lastName", "Lovelace");
  setInput(root, "email", "ada@example.com");
  const terms = root.querySelector<HTMLInputElement>("#accepted-terms");
  terms?.click();
  await vi.waitFor(() => expect(terms?.checked).toBe(true));
  root.querySelector<HTMLButtonElement>(".create-trip")?.click();
}

beforeEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
});

  it("applies a promo through price-breakdown and renders the server discount line and total", async () => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL).mockResolvedValueOnce(DISCOUNTED);
    const root = mount(clientWith(priceBreakdown));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, "  save 10 ");
    expect(root.querySelector<HTMLInputElement>("#promoCode")?.maxLength).toBe(64);
    await vi.waitFor(() => expect(root.textContent).toContain("Code applied"));
    expect(priceBreakdown.mock.calls[1]?.[0].promo_code).toBe("  save 10 ");
    expect([...root.querySelectorAll(".charge-row")].map((row) => row.textContent))
      .toEqual(["Base$90.00 USD", "Fuel Surcharge$2.70 USD", "Promo SAVE10-$9.00 USD"]);
    expect(root.textContent).toContain("$83.70 USD");
  });

  it("shows PROMO_INVALID under Promo code and keeps the normal booking available", async () => {
    const book = vi.fn<ApiClient["book"]>(async () => BOOKED);
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL)
      .mockRejectedValueOnce(new ApiError(422, {
        code: "PROMO_INVALID", message: "This code has expired.",
      }));
    const root = mount(clientWith(priceBreakdown, book));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, "OLD");
    await vi.waitFor(() => expect(root.querySelector("#promoCode-error")?.textContent)
      .toContain("This code has expired."));
    expect(root.textContent).toContain("$92.70 USD");
    expect(root.querySelector("#promoCode")).toBe(document.activeElement);
    await fillAndSubmit(root);
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    expect(book.mock.calls[0]?.[0]).not.toHaveProperty("promo_code");
  });

  it("accepts a tracking-only code and sends the unchanged code with booking", async () => {
    const book = vi.fn<ApiClient["book"]>(async () => BOOKED);
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL).mockResolvedValueOnce(TRACKED);
    const root = mount(clientWith(priceBreakdown, book));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, " Hotel Ref ");
    await vi.waitFor(() => expect(root.textContent).toContain("Code applied"));
    expect(root.textContent).not.toContain("Promo HOTELREF");
    expect(root.textContent).toContain("$92.70 USD");
    await fillAndSubmit(root);
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    expect(book.mock.calls[0]?.[0].promo_code).toBe(" Hotel Ref ");
  });

  it("removes an applied code and restores the server normal total", async () => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL).mockResolvedValueOnce(DISCOUNTED)
      .mockResolvedValueOnce(NORMAL);
    const root = mount(clientWith(priceBreakdown));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, "SAVE10");
    await vi.waitFor(() => expect(root.textContent).toContain("$83.70 USD"));
    expect(promoButton(root).textContent).toBe("Remove");
    promoButton(root).click();
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    expect(priceBreakdown.mock.calls[2]?.[0]).not.toHaveProperty("promo_code");
    expect(root.querySelector<HTMLInputElement>("#promoCode")?.value).toBe("");
  });

  it("ignores an applied-code response superseded by car-seat repricing", async () => {
    let resolvePromo: ((value: TaxiPriceBreakdownResponse) => void) | undefined;
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL)
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePromo = resolve; }))
      .mockResolvedValueOnce({ ...NORMAL, total: "107.70" });
    const root = mount(clientWith(priceBreakdown));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, "SAVE10");
    const seats = root.querySelector<HTMLSelectElement>("#carSeats");
    if (seats === null) throw new Error("Missing Car Seats");
    seats.value = "1";
    seats.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(root.textContent).toContain("$107.70 USD"));
    resolvePromo?.(DISCOUNTED);
    await Promise.resolve();
    expect(root.textContent).toContain("$107.70 USD");
    expect(root.textContent).not.toContain("Code applied");
  });

  it("shows booking-time PROMO_INVALID under Promo code and permits removal", async () => {
    const book = vi.fn<ApiClient["book"]>()
      .mockRejectedValueOnce(new ApiError(422, {
        code: "PROMO_INVALID", message: "This code is no longer available.",
      }))
      .mockResolvedValueOnce(BOOKED);
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(NORMAL).mockResolvedValueOnce(DISCOUNTED)
      .mockResolvedValueOnce(NORMAL);
    const root = mount(clientWith(priceBreakdown, book));
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    await applyCode(root, "SAVE10");
    await vi.waitFor(() => expect(root.textContent).toContain("Code applied"));
    await fillAndSubmit(root);
    await vi.waitFor(() => expect(root.querySelector("#promoCode-error")?.textContent)
      .toContain("This code is no longer available."));
    promoButton(root).click();
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(2));
    expect(book.mock.calls[0]?.[0].promo_code).toBe("SAVE10");
    expect(book.mock.calls[1]?.[0]).not.toHaveProperty("promo_code");
    expect(book.mock.calls[0]?.[1]).not.toBe(book.mock.calls[1]?.[1]);
  });

  it("hides promo controls for Request a Quote vehicles", async () => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>(async () => NORMAL);
    const root = mount(clientWith(priceBreakdown), REQUEST_QUOTE);
    await Promise.resolve();
    expect(root.querySelector("#promoCode")).toBeNull();
    expect(priceBreakdown).not.toHaveBeenCalled();
  });
