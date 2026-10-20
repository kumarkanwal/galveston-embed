import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiPriceBreakdownResponse,
  TaxiQuoteResponse,
} from "../src/api/client";
import { ApiError, NetworkError, RateLimitedError } from "../src/api/errors";
import { breakdownFailure } from "../src/app/confirm/breakdown-error";
import { buildBookingRequest, buildBreakdownRequest } from "../src/app/confirm/build-requests";
import { Confirm } from "../src/app/confirm/Confirm";
import type { ConfirmFormState } from "../src/app/confirm/types";
import type { TripFormState } from "../src/app/trip/types";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles",
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false,
    insurance_pct: "0.00", offer_car_seats: true, max_car_seats: 5,
    car_seat_price: "15.00", payment_methods: ["cash"],
    terms_and_conditions: "Use <b>care</b> & arrive early." },
} satisfies Business;

const TRIP: TripFormState = {
  service: "one_way", pickupDate: "2026-10-12", pickupTime: "00:44",
  passengers: 1, luggage: 0,
  pickupAddress: { address: "Houston, TX", zipcode: "77002", location: { lat: 1, lng: 2 } },
  dropoffAddress: { address: "Houston Premium Outlets", zipcode: "77433",
    location: { lat: 3, lng: 4 } },
  pickupAirportId: "", pickupAirportName: "", dropoffAirportId: "",
  pickupAirportLocation: null, dropoffAirportName: "", dropoffAirportLocation: null,
  airline: null, flightNumber: "",
};

const VEHICLE = {
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  name: "SEDAN private", passenger_capacity: 3, luggage_capacity: 3,
  photo_url: null, base_price: "90.00", pricing_basis: "distance",
  available: true, quote_status: "priced",
} satisfies QuotedVehicle;

const QUOTE = {
  distance_miles: "31.29", duration_minutes: 50, route_polyline: "route",
  out_of_service_area: false, vehicles: [VEHICLE],
} satisfies TaxiQuoteResponse;

const BREAKDOWN: TaxiPriceBreakdownResponse = {
  line_items: [
    { label: "Base Price", amount: "90.00", kind: "base", quantity: 1 },
    { label: "Fuel Surcharge", amount: "2.70", kind: "surcharge", quantity: 1 },
    { label: "Unrelated Zero", amount: "0.00", kind: "charge", quantity: 1 },
  ],
  subtotal: "92.70", discount_amount: "0.00", total: "92.70", currency: "USD",
};

function mockClient(priceBreakdown: ApiClient["priceBreakdown"]): ApiClient {
  return {
    getBusiness: vi.fn(async () => BUSINESS), getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []), getAirlines: vi.fn(async () => []),
    quote: vi.fn(async () => QUOTE), priceBreakdown, book: vi.fn(),
  };
}

function mount(
  priceBreakdown: ApiClient["priceBreakdown"] = vi.fn(async () => BREAKDOWN),
  business: Business = BUSINESS,
  autoFocusHeading = false,
) {
  const root = document.createElement("div");
  document.body.append(root);
  const client = mockClient(priceBreakdown);
  render(<Confirm autoFocusHeading={autoFocusHeading}
    business={business} client={client} form={TRIP} onBack={() => undefined}
    onBooked={() => undefined} onVehicleUnavailable={() => undefined}
    quote={QUOTE} serviceName="One Way Transfer" vehicle={VEHICLE} />, root);
  return { client, root };
}

function input(root: HTMLElement, id: string, value: string) {
  const element = root.querySelector<HTMLInputElement>(`#${id}`);
  if (element === null) throw new Error(`Missing input ${id}`);
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => document.body.replaceChildren());

describe("Confirm price breakdown", () => {
  it("requests once with the stored trip, vehicle, cash, and zero car seats", async () => {
    const priceBreakdown = vi.fn(async () => BREAKDOWN);
    mount(priceBreakdown);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledOnce());
    expect(priceBreakdown).toHaveBeenCalledWith(buildBreakdownRequest(TRIP, VEHICLE.vehicle_type_id, 0));
  });
  it("keeps API order, hides every exact zero line, and formats the server total", async () => {
    const { root } = mount();
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    expect([...root.querySelectorAll(".charge-row")].map((row) => row.textContent))
      .toEqual(["Base Price$90.00 USD", "Fuel Surcharge$2.70 USD"]);
    expect(root.textContent).not.toContain("Unrelated Zero");
    expect(root.textContent).toContain("One Way Transfer on Monday, October 12, 2026 at 12:44 AM");
  });

  it("shows the server peak surcharge line unchanged without client math", async () => {
    const peakBreakdown: TaxiPriceBreakdownResponse = {
      ...BREAKDOWN,
      line_items: [{ label: "Base Price", amount: "90.00", kind: "base", quantity: 1 },
        { label: "Peak Hours Increase", amount: "18.00", kind: "surcharge", quantity: 1 },
      ],
      subtotal: "108.00", total: "108.00",
    };
    const { root } = mount(vi.fn(async () => peakBreakdown));
    await vi.waitFor(() => expect(root.textContent).toContain("$108.00 USD"));
    expect([...root.querySelectorAll(".charge-row")].map((row) => row.textContent))
      .toEqual(["Base Price$90.00 USD", "Peak Hours Increase$18.00 USD"]);
  });

  it("ignores an older response after car seats trigger a newer request", async () => {
    const resolvers: Array<(value: TaxiPriceBreakdownResponse) => void> = [];
    const priceBreakdown = vi.fn(() => new Promise<TaxiPriceBreakdownResponse>((resolve) => {
      resolvers.push(resolve);
    }));
    const { root } = mount(priceBreakdown);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledOnce());
    const select = root.querySelector<HTMLSelectElement>(".car-seats select");
    if (select === null) throw new Error("Missing Car Seats select");
    select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledTimes(2));
    resolvers[1]?.({ ...BREAKDOWN, total: "107.70" });
    await vi.waitFor(() => expect(root.textContent).toContain("$107.70 USD"));
    resolvers[0]?.(BREAKDOWN);
    await Promise.resolve();
    expect(root.textContent).toContain("$107.70 USD");
    expect(root.textContent).not.toContain("$92.70 USD");
  });
});

describe("Car seat preferences", () => {
  it.each([
    ["disabled", { offer_car_seats: false, max_car_seats: 5 }],
    ["zero maximum", { offer_car_seats: true, max_car_seats: 0 }],
  ])("hides Car Seats and requests pricing with zero when %s", async (_label, settings) => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>(async () => BREAKDOWN);
    const business = { ...BUSINESS, settings: { ...BUSINESS.settings, ...settings } };
    const { root } = mount(priceBreakdown, business);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledOnce());
    expect(root.querySelector("#carSeats")).toBeNull();
    expect(priceBreakdown.mock.calls[0]?.[0].car_seats).toBe(0);
  });

  it("uses the configured options and per-seat label without calculating money", async () => {
    const business = { ...BUSINESS, settings: { ...BUSINESS.settings,
      max_car_seats: 2, car_seat_price: "12.50" } };
    const { root } = mount(vi.fn(async () => BREAKDOWN), business);
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    expect([...root.querySelectorAll<HTMLOptionElement>("#carSeats option")]
      .map((option) => option.value)).toEqual(["0", "1", "2"]);
    expect(root.textContent).toContain("$12.50 each");
  });

  it("shows and focuses a car-seat pricing error without changing any fields", async () => {
    const priceBreakdown = vi.fn<ApiClient["priceBreakdown"]>()
      .mockResolvedValueOnce(BREAKDOWN)
      .mockRejectedValueOnce(new ApiError(400, {
        code: "VALIDATION_ERROR", message: "This business allows at most 1 car seat.",
        field: "car_seats",
      }));
    const { root } = mount(priceBreakdown);
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    input(root, "firstName", "Ada");
    input(root, "comments", "Keep this note");
    const select = root.querySelector<HTMLSelectElement>("#carSeats");
    if (select === null) throw new Error("Missing Car Seats select");
    select.value = "2";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector("#carSeats-error")?.textContent)
      .toContain("at most 1"));
    await vi.waitFor(() => expect(select).toBe(document.activeElement));
    expect(select.value).toBe("2");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(root.querySelector<HTMLInputElement>("#firstName")?.value).toBe("Ada");
    expect(root.querySelector<HTMLInputElement>("#comments")?.value).toBe("Keep this note");
    expect(priceBreakdown).toHaveBeenCalledTimes(2);
  });
});

describe("Confirm breakdown lifetime", () => {
  it("loads a fresh breakdown after trip changes or step 3 is re-entered", async () => {
    const priceBreakdown = vi.fn(async () => BREAKDOWN);
    const { root, client } = mount(priceBreakdown);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledOnce());
    const changedTrip = { ...TRIP, passengers: 2 };
    render(<Confirm business={BUSINESS} client={client} form={changedTrip}
      onBack={() => undefined} onBooked={() => undefined} quote={QUOTE}
      onVehicleUnavailable={() => undefined}
      serviceName="One Way Transfer" vehicle={VEHICLE} />, root);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledTimes(2));
    render(null, root);
    render(<Confirm business={BUSINESS} client={client} form={changedTrip}
      onBack={() => undefined} onBooked={() => undefined} quote={QUOTE}
      onVehicleUnavailable={() => undefined}
      serviceName="One Way Transfer" vehicle={VEHICLE} />, root);
    await vi.waitFor(() => expect(priceBreakdown).toHaveBeenCalledTimes(3));
  });
});

describe("Confirm terms", () => {
  it("opens terms independently and closes without losing form data", async () => {
    const { root } = mount();
    input(root, "firstName", "Ada");
    input(root, "comments", "Call on arrival");
    const checkbox = root.querySelector<HTMLInputElement>(
      '[data-confirm-field="acceptedTerms"]',
    );
    const link = root.querySelector<HTMLButtonElement>(".terms-link");
    expect(link?.closest("label")).toBeNull();
    link?.click();
    await vi.waitFor(() => expect(root.querySelector(".terms-panel")).not.toBeNull());
    expect(checkbox?.checked).toBe(false);
    const panel = root.querySelector(".terms-panel");
    expect(panel?.getAttribute("aria-modal")).toBe("true");
    expect(panel?.getAttribute("aria-labelledby")).toBe("terms-heading");
    expect(panel?.textContent).toContain("Use <b>care</b> & arrive early.");
    expect(panel?.querySelector("b")).toBeNull();
    expect(root.querySelector(".terms-close")).toBe(document.activeElement);
    panel?.querySelector(".terms-close")?.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true, key: "Tab",
    }));
    expect(panel?.querySelector(".terms-text")).toBe(document.activeElement);
    panel?.querySelector(".terms-text")?.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true, key: "Tab", shiftKey: true,
    }));
    expect(panel?.querySelector(".terms-close")).toBe(document.activeElement);
    panel?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    await vi.waitFor(() => expect(root.querySelector(".terms-panel")).toBeNull());
    expect(root.querySelector<HTMLInputElement>("#firstName")?.value).toBe("Ada");
    expect(root.querySelector<HTMLInputElement>("#comments")?.value).toBe("Call on arrival");
    expect(link).toBe(document.activeElement);
    link?.click();
    await vi.waitFor(() => expect(root.querySelector(".terms-close")).not.toBeNull());
    root.querySelector<HTMLButtonElement>(".terms-close")?.click();
    await vi.waitFor(() => expect(root.querySelector(".terms-panel")).toBeNull());
  });

  it("keeps the required checkbox but hides the link when Admin has no terms", () => {
    const business = {
      ...BUSINESS,
      settings: { ...BUSINESS.settings, terms_and_conditions: null },
    } satisfies Business;
    const { root } = mount(vi.fn(async () => BREAKDOWN), business);
    expect(root.querySelector("[data-confirm-field='acceptedTerms']")).not.toBeNull();
    expect(root.querySelector(".terms-link")).toBeNull();
    expect(root.textContent).toContain("Terms & Conditions");
  });
});

describe("Confirm form", () => {
  it("moves focus to the step heading when navigation opens the step", async () => {
    const { root } = mount(vi.fn(async () => BREAKDOWN), BUSINESS, true);
    await vi.waitFor(() => expect(root.querySelector(".trip-summary h2"))
      .toBe(document.activeElement));
  });

  it("hides errors initially and validates only a field after blur", async () => {
    const { root } = mount();
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    expect(root.querySelector(".field-error")).toBeNull();
    const firstName = root.querySelector<HTMLInputElement>("#firstName");
    firstName?.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
    await vi.waitFor(() => expect(root.querySelector("#firstName-error")?.textContent)
      .toBe("Enter your first name."));
    expect(root.querySelector("#lastName-error")).toBeNull();
    expect(root.querySelector("#email-error")).toBeNull();
  });

  it("focuses the first error and accepts optional phone", async () => {
    const priceBreakdown = vi.fn(async () => BREAKDOWN);
    const { root } = mount(priceBreakdown);
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(root.textContent).toContain("Enter your first name."));
    expect(root.querySelector("#firstName")).toBe(document.activeElement);
    input(root, "firstName", "Ada"); input(root, "lastName", "Lovelace");
    input(root, "email", "ada@example.com"); input(root, "comments", "Call on arrival");
    root.querySelector<HTMLInputElement>('[data-confirm-field="acceptedTerms"]')?.click();
    await vi.waitFor(() => expect(
      root.querySelector<HTMLInputElement>('[data-confirm-field="acceptedTerms"]')?.checked,
    ).toBe(true));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    expect(priceBreakdown).toHaveBeenCalledOnce();
  });
});

describe("Confirm field error placement", () => {
  it("renders submit errors inside their corresponding fields", async () => {
    const { root } = mount();
    await vi.waitFor(() => expect(root.textContent).toContain("$92.70 USD"));
    root.querySelector<HTMLButtonElement>(".create-trip")?.click();
    await vi.waitFor(() => expect(root.querySelector("#firstName-error")).not.toBeNull());
    for (const [inputId, errorId] of [
      ["firstName", "firstName-error"], ["lastName", "lastName-error"],
      ["email", "email-error"], ["accepted-terms", "acceptedTerms-error"],
    ]) {
      const input = root.querySelector(`#${inputId}`);
      const error = root.querySelector(`#${errorId}`);
      expect(input?.closest(".field, .terms-field")?.contains(error ?? null)).toBe(true);
      expect(input?.getAttribute("aria-describedby")).toBe(errorId);
      expect(error?.querySelector(".error-icon")).not.toBeNull();
    }
  });

  it("builds only the approved booking fields", () => {
    const form: ConfirmFormState = { acceptedTerms: true, comments: "Call on arrival",
      email: "ada@example.com", firstName: "Ada", lastName: "Lovelace", phone: "" };
    const request = buildBookingRequest(TRIP, VEHICLE.vehicle_type_id, 2, form);
    expect(request).toMatchObject({ car_seats: 2, comments: "Call on arrival",
      customer: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com", phone: null },
      payment: { method: "cash" }, accepted_terms: true });
    expect(request).not.toHaveProperty("charges");
    expect(request).not.toHaveProperty("promo_code");
    expect(request).not.toHaveProperty("payment_method");
  });
});

describe("breakdown errors", () => {
  it.each([
    [new ApiError(400, { code: "VALIDATION_ERROR", message: "Bad field", field: "pickup_date" }), "Bad field"],
    [new ApiError(400, { code: "VALIDATION_ERROR", message: "Bad request" }), "Bad request"],
    [new ApiError(422, { code: "VEHICLE_UNAVAILABLE", message: "Unavailable" }), "Unavailable"],
    [new RateLimitedError({ code: "RATE_LIMITED", message: "Server" }),
      "Too many requests, please wait a moment and try again."],
    [new ApiError(503, { code: "SERVER_ERROR", message: "Details" }),
      "Pricing could not be loaded. Please go back and try again."],
    [new NetworkError(new Error("offline")),
      "Pricing could not be loaded. Please go back and try again."],
  ])("maps breakdown failures without retrying", (error, message) => {
    expect(breakdownFailure(error).message).toBe(message);
  });

  it("maps a named car-seat failure to the Car Seats control", () => {
    expect(breakdownFailure(new ApiError(400, {
      code: "VALIDATION_ERROR", message: "Car seats are disabled.", field: "car_seats",
    }))).toEqual({ field: "carSeats", message: "Car seats are disabled." });
  });

  it("shows a failed breakdown with Back and does not retry", async () => {
    const priceBreakdown = vi.fn(async () => Promise.reject(new NetworkError(new Error("offline"))));
    const { root } = mount(priceBreakdown);
    await vi.waitFor(() => expect(root.textContent).toContain("Please go back and try again."));
    expect(root.querySelector(".back-button")).not.toBeNull();
    expect(priceBreakdown).toHaveBeenCalledOnce();
  });
});
