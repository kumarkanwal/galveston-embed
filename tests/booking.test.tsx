import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiBookingResponse,
  TaxiPriceBreakdownResponse,
  TaxiQuoteResponse,
} from "../src/api/client";
import {
  ApiError,
  NetworkError,
  RateLimitedError,
  RequestTimeoutError,
  RequestInFlightError,
  UnauthorizedError,
} from "../src/api/errors";
import { bookingFailure } from "../src/app/booking/booking-error";
import { Confirmation } from "../src/app/booking/Confirmation";
import { Confirm } from "../src/app/confirm/Confirm";
import type { TripFormState } from "../src/app/trip/types";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles",
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false,
    insurance_pct: "0.00", offer_car_seats: true, max_car_seats: 5,
    car_seat_price: "15.00", payment_methods: ["cash"], terms_and_conditions: "Be ready." },
} satisfies Business;

const TRIP: TripFormState = {
  service: "one_way", pickupDate: "2026-10-12", pickupTime: "10:00",
  passengers: 2, luggage: 1,
  pickupAddress: { address: "Galveston, TX", zipcode: "77550", location: { lat: 1, lng: 2 } },
  dropoffAddress: { address: "Houston, TX", zipcode: "77002", location: { lat: 3, lng: 4 } },
  pickupAirportId: "", pickupAirportName: "", dropoffAirportId: "",
  pickupAirportLocation: null, dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
};

const PRICED = {
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  name: "Sedan", passenger_capacity: 3, luggage_capacity: 3,
  base_price: "90.00", available: true, quote_status: "priced",
} satisfies QuotedVehicle;

const MANUAL = {
  ...PRICED, vehicle_type_id: "22222222-2222-2222-2222-222222222222",
  name: "Van", base_price: null, quote_status: "request_quote",
} satisfies QuotedVehicle;

const BREAKDOWN: TaxiPriceBreakdownResponse = {
  line_items: [{ label: "Base", amount: "90.00", kind: "base", quantity: 1 }],
  subtotal: "90.00", discount_amount: "0.00", total: "90.00", currency: "USD",
};

const BOOKED: TaxiBookingResponse = {
  order_id: "33333333-3333-3333-3333-333333333333",
  order_number: "HVT-2026-003211", status: "confirmed", total: "92.70",
  amount_paid: "0.00", payment_method: "cash", confirmation_email_sent: false,
};

function clientWith(book: ApiClient["book"]) {
  return {
    getBusiness: vi.fn(async () => BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []),
    quote: vi.fn(), priceBreakdown: vi.fn(async () => BREAKDOWN), book,
  } satisfies ApiClient;
}

function mount(
  book: ApiClient["book"],
  vehicle: QuotedVehicle = PRICED,
  outOfServiceArea = false,
  business: Business = BUSINESS,
  onVehicleUnavailable = vi.fn(),
) {
  const root = document.createElement("div");
  document.body.append(root);
  const client = clientWith(book);
  const onBooked = vi.fn();
  const quote = { out_of_service_area: outOfServiceArea, vehicles: [vehicle] } satisfies TaxiQuoteResponse;
  render(<Confirm business={business} client={client} form={TRIP} onBack={() => undefined}
    onBooked={onBooked} onVehicleUnavailable={onVehicleUnavailable}
    quote={quote} serviceName="One Way Transfer" vehicle={vehicle} />, root);
  return { client, onBooked, onVehicleUnavailable, root };
}

function enter(root: HTMLElement, id: string, value: string) {
  const element = root.querySelector<HTMLInputElement>(`#${id}`);
  if (element === null) throw new Error(`Missing input ${id}`);
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

async function fillValid(root: HTMLElement, waitForBreakdown = true) {
  if (waitForBreakdown) await vi.waitFor(() => expect(root.textContent).toContain("$90.00 USD"));
  enter(root, "firstName", "Ada");
  enter(root, "lastName", "Lovelace");
  enter(root, "email", "ada@example.com");
  root.querySelector<HTMLInputElement>('[data-confirm-field="acceptedTerms"]')?.click();
}

beforeEach(() => {
  document.body.replaceChildren();
  sessionStorage.clear();
});

describe("booking submission", () => {
  it("sends once on double-click with the E-4 body and an idempotency key", async () => {
    let resolve: ((value: TaxiBookingResponse) => void) | undefined;
    const book = vi.fn<ApiClient["book"]>(() =>
      new Promise<TaxiBookingResponse>((done) => { resolve = done; }));
    const { onBooked, root } = mount(book);
    await fillValid(root);
    const button = root.querySelector<HTMLButtonElement>(".create-trip");
    button?.click();
    button?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    expect(book.mock.calls[0]?.[0]).toMatchObject({
      accepted_terms: true, car_seats: 0,
      customer: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
      payment: { method: "cash" },
    });
    expect(book.mock.calls[0]?.[1]).toMatch(/^[0-9a-f-]{36}$/u);
    resolve?.(BOOKED);
    await vi.waitFor(() => expect(onBooked).toHaveBeenCalledWith(BOOKED, false));
  });

  it("sends once when Enter submission and click happen together", async () => {
    let resolve: ((value: TaxiBookingResponse) => void) | undefined;
    const book = vi.fn<ApiClient["book"]>(() =>
      new Promise<TaxiBookingResponse>((done) => { resolve = done; }));
    const { root } = mount(book);
    await fillValid(root);
    root.querySelector("form")?.dispatchEvent(new Event("submit", {
      bubbles: true, cancelable: true,
    }));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    resolve?.(BOOKED);
  });

});

describe("booking idempotency", () => {

  it("reuses the key on retry and changes it after a field edit", async () => {
    const book = vi.fn<ApiClient["book"]>(async () =>
      Promise.reject(new NetworkError(new Error("offline"))));
    const { root } = mount(book);
    await fillValid(root);
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(root.textContent).toContain("not be booked twice"));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(2));
    expect(book.mock.calls[1]?.[1]).toBe(book.mock.calls[0]?.[1]);
    await vi.waitFor(() => expect(
      root.querySelector<HTMLButtonElement>(".create-trip")?.disabled,
    ).toBe(false));
    enter(root, "firstName", "Grace");
    await vi.waitFor(() => expect(root.textContent).not.toContain("not be booked twice"));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(3));
    expect(book.mock.calls[2]?.[1]).not.toBe(book.mock.calls[1]?.[1]);
    expect(root.querySelector<HTMLInputElement>("#email")?.value).toBe("ada@example.com");
  });

  it("reuses the successful attempt key after the confirmation page is left", async () => {
    const book = vi.fn<ApiClient["book"]>(async () => BOOKED);
    const first = mount(book);
    await fillValid(first.root);
    first.root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());

    const revisited = mount(book);
    await fillValid(revisited.root);
    revisited.root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledTimes(2));
    expect(book.mock.calls[1]?.[1]).toBe(book.mock.calls[0]?.[1]);
  });

});

describe("booking field errors", () => {
  it("keeps form data and shows a named API error beside its field", async () => {
    const book = vi.fn<ApiClient["book"]>(async () => Promise.reject(new ApiError(400, {
      code: "VALIDATION_ERROR", message: "That email cannot be used.", field: "customer.email",
    })));
    const { root } = mount(book);
    await fillValid(root);
    enter(root, "comments", "Call on arrival");
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(root.querySelector("#email-error")?.textContent)
      .toContain("That email cannot be used."));
    expect(root.querySelector("#email")).toBe(document.activeElement);
    expect(root.querySelector("#email")?.getAttribute("aria-describedby")).toBe("email-error");
    expect(root.querySelector<HTMLInputElement>("#firstName")?.value).toBe("Ada");
    expect(root.querySelector<HTMLInputElement>("#comments")?.value).toBe("Call on arrival");
    expect(book).toHaveBeenCalledOnce();
  });
});

describe("booking car-seat preferences", () => {
  it.each([
    ["priced", PRICED, true],
    ["Request a Quote", MANUAL, false],
  ])("shows and focuses a %s car-seat error without changing the choice", async (
    _label, vehicle, waitForBreakdown,
  ) => {
    const book = vi.fn<ApiClient["book"]>(async () => Promise.reject(new ApiError(400, {
      code: "VALIDATION_ERROR", message: "Car seats are not offered by this business.",
      field: "car_seats",
    })));
    const { client, root } = mount(book, vehicle);
    await fillValid(root, waitForBreakdown);
    enter(root, "comments", "Keep this note");
    const carSeats = root.querySelector<HTMLSelectElement>("#carSeats");
    if (carSeats === null) throw new Error("Missing Car Seats select");
    carSeats.value = "2";
    carSeats.dispatchEvent(new Event("change", { bubbles: true }));
    if (waitForBreakdown) {
      await vi.waitFor(() => expect(client.priceBreakdown).toHaveBeenCalledTimes(2));
      await vi.waitFor(() => expect(root.textContent).toContain("$90.00 USD"));
    }
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(root.querySelector("#carSeats-error")?.textContent)
      .toContain("not offered"));
    await vi.waitFor(() => expect(carSeats).toBe(document.activeElement));
    expect(carSeats.value).toBe("2");
    expect(root.querySelector<HTMLInputElement>("#firstName")?.value).toBe("Ada");
    expect(root.querySelector<HTMLInputElement>("#comments")?.value).toBe("Keep this note");
    enter(root, "firstName", "Grace");
    expect(root.querySelector("#carSeats-error")).not.toBeNull();
    expect(book).toHaveBeenCalledOnce();
  });

  it.each([
    ["disabled", { offer_car_seats: false, max_car_seats: 5 }],
    ["zero maximum", { offer_car_seats: true, max_car_seats: 0 }],
  ])("submits zero car seats when the control is %s", async (_label, settings) => {
    const book = vi.fn<ApiClient["book"]>(async () => BOOKED);
    const business = { ...BUSINESS, settings: { ...BUSINESS.settings, ...settings } };
    const { root } = mount(book, PRICED, false, business);
    await fillValid(root);
    expect(root.querySelector("#carSeats")).toBeNull();
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    expect(book.mock.calls[0]?.[0].car_seats).toBe(0);
  });
});

describe("request quote booking", () => {
  it("skips pricing, keeps car seats, and submits with quote wording", async () => {
    const book = vi.fn<ApiClient["book"]>(async () =>
      ({ ...BOOKED, status: "requested", total: "0.00" }));
    const business = { ...BUSINESS, settings: { ...BUSINESS.settings,
      max_car_seats: 2, car_seat_price: "27.00" } };
    const { client, onBooked, root } = mount(book, MANUAL, true, business);
    expect(client.priceBreakdown).not.toHaveBeenCalled();
    expect(root.textContent).toContain("outside our standard service area");
    expect(root.textContent).toContain("Request a Quote");
    expect(root.querySelector(".charges")).toBeNull();
    expect(root.querySelector<HTMLButtonElement>(".create-trip")?.textContent)
      .toContain("Request Quote");
    const carSeats = root.querySelector<HTMLSelectElement>(".car-seats select");
    if (carSeats === null) throw new Error("Missing Car Seats select");
    expect(carSeats.options).toHaveLength(3);
    expect(root.textContent).not.toContain("$27.00 each");
    carSeats.value = "2";
    carSeats.dispatchEvent(new Event("change", { bubbles: true }));
    await fillValid(root, false);
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(book).toHaveBeenCalledOnce());
    expect(book.mock.calls[0]?.[0]).toMatchObject({ car_seats: 2 });
    await vi.waitFor(() => expect(onBooked).toHaveBeenCalledWith(
      expect.objectContaining({ status: "requested", total: "0.00" }), true,
    ));
  });
});

describe("booking errors", () => {
  it.each([
    [new RequestInFlightError({ code: "REQUEST_IN_FLIGHT", message: "Wait" }), "still being processed"],
    [new RateLimitedError({ code: "RATE_LIMITED", message: "Wait" }), "Too many requests"],
    [new NetworkError(new Error("offline")), "not be booked twice"],
    [new ApiError(500, { code: "SERVER_ERROR", message: "Internal" }), "not be booked twice"],
    [new ApiError(503, { code: "BOOKING_UNAVAILABLE", message: "Try later" }), "Try later"],
    [new UnauthorizedError({ code: "UNAUTHENTICATED", message: "Server detail" }),
      "This booking form is not configured."],
  ])("maps the failure without retrying", (error, message) => {
    expect(bookingFailure(error).message).toContain(message);
  });

});

describe("booking error details", () => {
  it("maps a customer field error beside the field", () => {
    const error = new ApiError(400, {
      code: "VALIDATION_ERROR", message: "Email is invalid", field: "customer.email",
    });
    expect(bookingFailure(error)).toEqual({ field: "email", message: "Email is invalid" });
  });

});

describe("booking error submission", () => {
  it.each([
    [new NetworkError(new Error("offline")), "not be booked twice"],
    [new RequestTimeoutError(new Error("timeout")), "not be booked twice"],
    [new ApiError(500, { code: "SERVER_ERROR", message: "Internal" }), "not be booked twice"],
    [new RateLimitedError({ code: "RATE_LIMITED", message: "Server" }), "Too many requests"],
    [new UnauthorizedError({ code: "UNAUTHENTICATED", message: "Server" }), "not configured"],
    [new ApiError(422, { code: "ADVANCE_BOOKING_VIOLATION", message: "Choose a later time." }),
      "Choose a later time."],
    [new ApiError(422, { code: "PAYMENT_METHOD_NOT_OFFERED", message: "Cash is unavailable." }),
      "Cash is unavailable."],
    [new ApiError(422, { code: "AIRPORT_ADDRESS_MISSING", message: "Select an airport." }),
      "Select an airport."],
  ])("keeps the form and never automatically retries %#", async (error, message) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const book = vi.fn<ApiClient["book"]>(async () => Promise.reject(error));
    const { root } = mount(book);
    await fillValid(root);
    enter(root, "comments", "Call on arrival");
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(root.textContent).toContain(message));
    expect(root.querySelector<HTMLInputElement>("#firstName")?.value).toBe("Ada");
    expect(root.querySelector<HTMLInputElement>("#comments")?.value).toBe("Call on arrival");
    expect(book).toHaveBeenCalledOnce();
    if (error instanceof UnauthorizedError) {
      expect(consoleError).toHaveBeenCalledWith(
        "Galveston booking widget configuration was rejected.",
      );
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain("bk_");
    }
    consoleError.mockRestore();
  });

  it("sends VEHICLE_UNAVAILABLE back to vehicle selection without retrying", async () => {
    const error = new ApiError(422, { code: "VEHICLE_UNAVAILABLE",
      message: "No vehicle is available for the requested time." });
    const book = vi.fn<ApiClient["book"]>(async () => Promise.reject(error));
    const onVehicleUnavailable = vi.fn();
    const { root } = mount(book, PRICED, false, BUSINESS, onVehicleUnavailable);
    await fillValid(root); root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(onVehicleUnavailable).toHaveBeenCalledWith(error.message));
    expect(book).toHaveBeenCalledOnce(); expect(root.textContent).not.toContain(error.message);
  });
});

describe("confirmation", () => {
  it("shows response total and omits the email promise when no email was sent", () => {
    const root = document.createElement("div");
    render(<Confirmation currency="USD" requestQuote={false} response={BOOKED} />, root);
    expect(root.textContent).toContain("HVT-2026-003211");
    expect(root.textContent).toContain("reservation was successfully submitted");
    expect(root.textContent).toContain("$92.70 USD");
    expect(root.textContent).not.toContain("receive an email");
    expect(root.querySelector(".back-button")).toBeNull();
    expect(root.querySelector(".progress")?.getAttribute("aria-label"))
      .toBe("Booking progress, completed");
    expect(root.querySelector("[aria-current]")).toBeNull();
    expect([...root.querySelectorAll(".progress li")].every((item) =>
      item.getAttribute("aria-label")?.endsWith("completed"))).toBe(true);
  });

  it("moves focus to the confirmation heading", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    render(<Confirmation autoFocusHeading currency="USD" requestQuote={false}
      response={BOOKED} />, root);
    await vi.waitFor(() => expect(root.querySelector("h1")).toBe(document.activeElement));
  });

  it.each(["requested", "pending"])("uses priced booking-request wording for %s", (status) => {
    const root = document.createElement("div");
    render(<Confirmation currency="USD" requestQuote={false}
      response={{ ...BOOKED, status, confirmation_email_sent: true }} />, root);
    expect(root.textContent).toContain("booking request was submitted");
    expect(root.textContent).toContain("The company will confirm your trip.");
    expect(root.textContent).toContain("HVT-2026-003211");
    expect(root.textContent).not.toContain("receive an email");
  });

  it("uses quote wording and never promises an email", () => {
    const root = document.createElement("div");
    render(<Confirmation currency="USD" requestQuote
      response={{ ...BOOKED, status: "requested", total: "0.00", confirmation_email_sent: true }} />,
    root);
    expect(root.textContent).toContain("quote request was successfully submitted");
    expect(root.textContent).toContain("pending reservation number");
    expect(root.textContent).not.toContain("receive an email");
    expect(root.textContent).not.toContain("$0.00 USD");
  });
});
