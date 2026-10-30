import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  Business,
  TaxiBookingResponse,
  TaxiQuoteResponse,
} from "../src/api/client";
import { ApiError, NetworkError, RateLimitedError } from "../src/api/errors";
import { useBookingFlow } from "../src/app/shell/use-booking-flow";
import { quoteFailure } from "../src/app/trip/quote-error";

const BUSINESS = {
  id: "business-1", name: "Island Transit", type: "taxi", currency: "USD",
  timezone: "America/Chicago", distance_unit: "miles", emails_enabled: false,
  max_passengers: 8, max_luggage: 8,
  settings: { advance_booking_hours: 0, insurance_enabled: false,
    insurance_pct: "0.00", offer_car_seats: true, max_car_seats: 5,
    car_seat_price: "15.00", payment_methods: ["cash"],
    show_map: true, show_service_dropdown: true },
} satisfies Business;
const QUOTE: TaxiQuoteResponse = {
  distance_miles: "50.00",
  duration_minutes: 60,
  route_polyline: "encoded",
  out_of_service_area: false,
  vehicles: [{ vehicle_type_id: "vehicle-1", name: "Sedan", passenger_capacity: 3,
    luggage_capacity: 2, base_price: "90.00", available: true, quote_status: "priced" }],
};
const BOOKED: TaxiBookingResponse = {
  order_id: "order-1", order_number: "HVT-1", status: "confirmed", total: "90.00",
  amount_paid: "0.00", payment_method: "cash", confirmation_email_sent: false,
};

function clientWith(quote: ApiClient["quote"]): ApiClient {
  return {
    getBusiness: vi.fn(async () => BUSINESS),
    getServiceTypes: vi.fn(async () => []),
    getAirports: vi.fn(async () => []),
    getAirlines: vi.fn(async () => []),
    quote,
    priceBreakdown: vi.fn(async () => ({
      subtotal: "0.00", discount_amount: "0.00", total: "0.00", currency: "USD",
    })),
    book: vi.fn(),
  };
}

type Flow = ReturnType<typeof useBookingFlow>;
let latestFlow: Flow | undefined;

function Harness({ client, service = "one_way" }: {
  client: ApiClient;
  service?: "one_way" | "round_trip";
}) {
  const flow = useBookingFlow(client, BUSINESS, service, { passengers: 8, bags: 8 });
  latestFlow = flow;
  return <div data-step={flow.state.step}>{flow.state.formError}</div>;
}

function flow(): Flow {
  if (latestFlow === undefined) throw new Error("Flow has not rendered.");
  return latestFlow;
}

async function makeValid(roundTrip = false) {
  const address = { address: "Galveston, TX 77550", zipcode: "77550",
    location: { lat: 29.3, lng: -94.8 } };
  flow().update("pickupDate", "2026-12-01");
  flow().update("pickupTime", "10:00");
  flow().update("pickupAddress", address);
  flow().update("dropoffAddress", address);
  if (roundTrip) {
    flow().update("returnDate", "2026-12-02");
    flow().update("returnTime", "10:00");
  }
  await vi.waitFor(() => expect(flow().state.form.dropoffAddress).toEqual(address));
}

function submitEvent(): SubmitEvent {
  return { preventDefault: vi.fn() } as unknown as SubmitEvent;
}

beforeEach(() => {
  latestFlow = undefined;
  render(null, document.body);
  document.body.replaceChildren();
});

describe("quote validation timing", () => {
  it("reveals errors only after blur or the first Check Pricing attempt", async () => {
    render(<Harness client={clientWith(vi.fn(async () => QUOTE))} />, document.body);
    expect(flow().state.errors).toEqual({});
    flow().blur("pickupAddress");
    await vi.waitFor(() => expect(flow().state.errors).toEqual({
      pickupAddress: "Please choose a street address or airport.",
    }));
    flow().update("pickupAddress", { address: "2021 Strand St", zipcode: "77550",
      location: { lat: 29.3, lng: -94.8 } });
    await vi.waitFor(() => expect(flow().state.errors).toEqual({}));
    await flow().submit(submitEvent());
    expect(flow().state.hasCheckedPricing).toBe(true);
    expect(flow().state.errors).toMatchObject({
      dropoffAddress: "Please choose a street address or airport.",
      pickupTime: "Select a pickup time.",
    });
  });
});

describe("quote submission", () => {
  it("requests focus for the first validation error on failed submit", async () => {
    render(<Harness client={clientWith(vi.fn(async () => QUOTE))} />, document.body);
    await flow().submit(submitEvent());
    expect(flow().state.errorFocusField).toBe("pickupTime");
    expect(flow().state.errorFocusVersion).toBe(1);
  });

  it("sends exactly once while a request is in flight", async () => {
    let resolveQuote: ((quote: TaxiQuoteResponse) => void) | undefined;
    const quote = vi.fn(() => new Promise<TaxiQuoteResponse>((resolve) => { resolveQuote = resolve; }));
    render(<Harness client={clientWith(quote)} />, document.body);
    await makeValid();
    const first = flow().submit(submitEvent());
    const second = flow().submit(submitEvent());
    expect(quote).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(flow().state.isSubmitting).toBe(true));
    resolveQuote?.(QUOTE);
    await Promise.all([first, second]);
    await vi.waitFor(() => expect(flow().state.step).toBe(2));
  });

  it("does not retry a failed request", async () => {
    const quote = vi.fn(async () => Promise.reject(new NetworkError(new Error("offline"))));
    render(<Harness client={clientWith(quote)} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    expect(quote).toHaveBeenCalledOnce();
    expect(flow().state.formError).toContain("could not be loaded");
  });

  it("shows the server minimum-gap message on Return Date without retrying", async () => {
    const error = new ApiError(400, { code: "VALIDATION_ERROR",
      message: "Return must leave at least 30 minutes after arrival.", field: "return_date" });
    const quote = vi.fn(async () => Promise.reject(error));
    render(<Harness client={clientWith(quote)} service="round_trip" />, document.body);
    await makeValid(true); await flow().submit(submitEvent());
    expect(quote).toHaveBeenCalledOnce();
    expect(flow().state.errors.returnDate).toBe(error.message);
    expect(flow().state.form.returnDate).toBe("2026-12-02");
  });
});

describe("booking navigation", () => {
  it("keeps fields on Back and clears the quote after an edit", async () => {
    const quote = vi.fn(async () => QUOTE);
    render(<Harness client={clientWith(quote)} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    await vi.waitFor(() => expect(flow().state.step).toBe(2));
    flow().back();
    await vi.waitFor(() => expect(flow().state.step).toBe(1));
    expect(flow().state.form.pickupAddress?.zipcode).toBe("77550");
    expect(flow().state.quote?.route_polyline).toBe("encoded");
    flow().update("passengers", 2);
    await vi.waitFor(() => expect(flow().state.quote).toBeNull());
    expect(flow().state.selectedVehicle).toBeNull();
  });

  it("stores a chosen vehicle and supports Back to step 2", async () => {
    render(<Harness client={clientWith(vi.fn(async () => QUOTE))} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    await vi.waitFor(() => expect(flow().state.step).toBe(2));
    const vehicle = QUOTE.vehicles?.[0];
    if (vehicle === undefined) throw new Error("Fixture vehicle missing.");
    flow().choose(vehicle);
    await vi.waitFor(() => expect(flow().state.step).toBe(3));
    expect(flow().state.selectedVehicle).toBe(vehicle);
    flow().back();
    await vi.waitFor(() => expect(flow().state.step).toBe(2));
  });
});

describe("booking-time availability navigation", () => {
  it("returns a booking-time unavailable vehicle to step 2 and disables it", async () => {
    render(<Harness client={clientWith(vi.fn(async () => QUOTE))} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    const vehicle = QUOTE.vehicles?.[0];
    if (vehicle === undefined) throw new Error("Fixture vehicle missing.");
    flow().choose(vehicle);
    await vi.waitFor(() => expect(flow().state.step).toBe(3));
    flow().vehicleUnavailable("No vehicle is available for the requested time.");
    await vi.waitFor(() => expect(flow().state.step).toBe(2));
    expect(flow().state.selectedVehicle).toBeNull();
    expect(flow().state.vehicleNotice).toContain("No vehicle is available");
    expect(flow().state.quote?.vehicles?.[0]).toMatchObject({
      available: false,
      quote_status: "unavailable",
    });
  });
});

describe("booking success navigation", () => {
  it("clears booking selections after success", async () => {
    render(<Harness client={clientWith(vi.fn(async () => QUOTE))} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    const vehicle = QUOTE.vehicles?.[0];
    if (vehicle === undefined) throw new Error("Fixture vehicle missing.");
    flow().choose(vehicle);
    await vi.waitFor(() => expect(flow().state.selectedVehicle).toBe(vehicle));
    flow().complete(BOOKED, false, "cash", "ada@example.com");
    await vi.waitFor(() => expect(flow().state.confirmation?.response).toBe(BOOKED));
    expect(flow().state.quote).toBeNull();
    expect(flow().state.selectedVehicle).toBeNull();
  });
});

describe("quote errors", () => {
  it("requests focus for a named API field error", async () => {
    const quote = vi.fn(async () => Promise.reject(new ApiError(400, {
      code: "VALIDATION_ERROR", message: "Choose another date.", field: "pickup_date",
    })));
    render(<Harness client={clientWith(quote)} />, document.body);
    await makeValid();
    await flow().submit(submitEvent());
    expect(flow().state.errorFocusField).toBe("pickupDate");
    expect(flow().state.errorFocusVersion).toBeGreaterThan(0);
  });

  it.each([
    [new ApiError(400, { code: "VALIDATION_ERROR", message: "Bad date", field: "pickup_date" }),
      { field: "pickupDate", message: "Bad date" }],
    [new ApiError(400, { code: "VALIDATION_ERROR", message: "Bad request" }),
      { field: null, message: "Bad request" }],
    [new ApiError(422, { code: "ADVANCE_BOOKING_VIOLATION", message: "Too soon" }),
      { field: null, message: "Too soon" }],
    [new RateLimitedError({ code: "RATE_LIMITED", message: "Server wording" }),
      { field: null, message: "Too many requests, please wait a moment and try again." }],
    [new ApiError(503, { code: "SERVER_ERROR", message: "Details" }),
      { field: null, message: "Pricing could not be loaded. Please try again." }],
  ])("maps a quote failure", (error, expected) => {
    expect(quoteFailure(error, "one_way")).toEqual(expected);
  });

  it("shows the live airport pickup_address error beside Pickup Airport", () => {
    const error = new ApiError(400, {
      code: "VALIDATION_ERROR",
      message: "A pickup address is required.",
      field: "pickup_address",
    });
    expect(quoteFailure(error, "airport_pickup")).toEqual({
      field: "pickupAirportId",
      message: "A pickup address is required.",
    });
  });
});
