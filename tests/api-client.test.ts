import { describe, expect, it, vi } from "vitest";

import {
  createApiClient,
  type ShuttleBookingRequest,
  type ShuttleQuoteRequest,
  type TaxiBookingRequest,
  type TaxiBookingResponse,
  type TaxiPriceBreakdownRequest,
  type TaxiQuoteRequest,
} from "../src/api/client";
import {
  ApiError,
  NetworkError,
  RateLimitedError,
  RequestTimeoutError,
  RequestInFlightError,
  UnauthorizedError,
} from "../src/api/errors";

const BUSINESS = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Island Transit",
  type: "taxi",
  currency: "USD",
  timezone: "America/Chicago",
  distance_unit: "miles",
  max_passengers: 8,
  max_luggage: 8,
  settings: {
    advance_booking_hours: 6,
    car_seat_price: "15.00",
    insurance_enabled: false,
    insurance_pct: "0.00",
    max_car_seats: 5,
    offer_car_seats: true,
    payment_methods: ["cash"],
    show_map: true,
    show_service_dropdown: true,
    terms_and_conditions: "Arrive ten minutes early.",
  },
};

const QUOTE: TaxiQuoteRequest = {
  service_type: "one_way",
  pickup_date: "2026-10-20",
  pickup_time: "10:00:00",
  passengers: 1,
  large_bags: 0,
  small_bags: 0,
};

const BREAKDOWN: TaxiPriceBreakdownRequest = {
  ...QUOTE,
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  payment_method: "cash",
  car_seats: 0,
};

const BOOKING: TaxiBookingRequest = {
  ...QUOTE,
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  car_seats: 0,
  customer: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
  payment: { method: "cash" },
  accepted_terms: true,
};

const BOOKED: TaxiBookingResponse = {
  order_id: "22222222-2222-2222-2222-222222222222",
  order_number: "HVT-2026-003211",
  status: "confirmed",
  total: "92.70",
  amount_paid: "0.00",
  payment_method: "cash",
  confirmation_email_sent: false,
};

const SHUTTLE_QUOTE: ShuttleQuoteRequest = {
  legs: [{ departure_type: "scheduled", schedule_id: "schedule-1",
    pax_adult: 1, pax_senior: 0, pax_child: 0 }],
  insurance_selected: false,
  payment_method: "cash",
};

const SHUTTLE_BOOKING: ShuttleBookingRequest = {
  legs: SHUTTLE_QUOTE.legs,
  insurance_selected: false,
  customer: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
  payment: { method: "cash" },
  accepted_terms: true,
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(fetch: (input: Request) => Promise<Response>) {
  return createApiClient({ apiBase: "https://api.test/", businessKey: "bk_test", fetch });
}

describe("API request setup", () => {
  it("sends required headers and unwraps business data", async () => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: BUSINESS }));
    const business = await clientWith(fetch).getBusiness();
    const request = fetch.mock.calls[0]?.[0];
    expect(business.name).toBe(BUSINESS.name);
    expect(business.settings.terms_and_conditions).toBe("Arrive ten minutes early.");
    expect(request?.headers.get("X-Business-Key")).toBe("bk_test");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    expect(request?.url).toBe("https://api.test/v1/public/business");
  });

  it.each([
    ["getAirports", "/v1/public/taxi/airports"],
    ["getAirlines", "/v1/public/taxi/airlines"],
  ] as const)("loads public taxi data with %s", async (method, path) => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: [] }));
    await clientWith(fetch)[method]();
    expect(fetch.mock.calls[0]?.[0].url).toBe(`https://api.test${path}`);
  });

  it("returns generated service types in API order", async () => {
    const data = [
      { id: "1", code: "one_way", name: "One Way Transfer" },
      { id: "2", code: "airport_pickup", name: "Airport Pickup" },
    ] as const;
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data }));
    await expect(clientWith(fetch).getServiceTypes()).resolves.toEqual(data);
  });

  it("sends a POST once without automatic retries", async () => {
    const fetch = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code: "SERVER_ERROR", message: "Unavailable" } }, 503),
    );
    await expect(clientWith(fetch).quote(QUOTE)).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.test/v1/public/taxi/quote?hide_incapable=false");
    expect(request?.headers.get("X-Business-Key")).toBe("bk_test");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    await expect(request?.clone().json()).resolves.toEqual(QUOTE);
  });

});

describe("airport API data", () => {
  it("returns the server-owned airport address and zipcode", async () => {
    const airport = {
      id: "airport-1",
      name: "George Bush Intercontinental Airport",
      code: "IAH",
      address: "2800 N Terminal Rd, Houston, TX",
      zipcode: "77032",
    };
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: [airport] }));
    await expect(clientWith(fetch).getAirports()).resolves.toEqual([airport]);
  });
});

describe("price breakdown API", () => {
  it("posts once without retrying", async () => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: {
      line_items: [], subtotal: "90.00", discount_amount: "0.00",
      total: "90.00", currency: "USD",
    } }));
    await clientWith(fetch).priceBreakdown(BREAKDOWN);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.url).toBe("https://api.test/v1/public/taxi/price-breakdown");
    await expect(request?.clone().json()).resolves.toEqual(BREAKDOWN);
  });
});

describe("shuttle API", () => {
  it("loads grouped locations with the documented exclusion query", async () => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: [] }));
    await clientWith(fetch).getShuttleLocations("origin-1");
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.url).toBe(
      "https://api.test/v1/public/shuttle/locations?exclude_location_id=origin-1",
    );
  });

  it.each([
    ["searchShuttle", "/v1/public/shuttle/search"],
    ["searchShuttleReturn", "/v1/public/shuttle/search/return"],
  ] as const)("sends generated query fields with %s", async (method, path) => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: {} }));
    const query = { from_location_id: "from", to_location_id: "to", date: "2026-10-30",
      pax_adult: 1, pax_senior: 0, pax_child: 0 };
    await clientWith(fetch)[method](query);
    const url = new URL(fetch.mock.calls[0]?.[0].url ?? "");
    expect(url.pathname).toBe(path);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      from_location_id: "from", to_location_id: "to", date: "2026-10-30",
      pax_adult: "1", pax_senior: "0", pax_child: "0",
    });
  });

  it("posts quote and booking bodies once with the booking idempotency key", async () => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: {} }));
    const client = clientWith(fetch);
    await client.quoteShuttle(SHUTTLE_QUOTE);
    await client.bookShuttle(SHUTTLE_BOOKING, "shuttle-key");
    expect(fetch).toHaveBeenCalledTimes(2);
    const quoteRequest = fetch.mock.calls[0]?.[0];
    const bookingRequest = fetch.mock.calls[1]?.[0];
    expect(quoteRequest?.url).toBe("https://api.test/v1/public/shuttle/quote");
    await expect(quoteRequest?.clone().json()).resolves.toEqual(SHUTTLE_QUOTE);
    expect(bookingRequest?.url).toBe("https://api.test/v1/public/shuttle/booking");
    expect(bookingRequest?.headers.get("Idempotency-Key")).toBe("shuttle-key");
    await expect(bookingRequest?.clone().json()).resolves.toEqual(SHUTTLE_BOOKING);
  });
});

describe("booking API", () => {
  it.each([200, 201])("treats %s as success and sends the idempotency key", async (status) => {
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: BOOKED }, status));
    await expect(clientWith(fetch).book(BOOKING, "booking-key")).resolves.toEqual(BOOKED);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.url).toBe("https://api.test/v1/public/taxi/booking");
    expect(request?.url).not.toContain("booking-key");
    expect(request?.url).not.toContain("bk_test");
    expect(request?.headers.get("Idempotency-Key")).toBe("booking-key");
    await expect(request?.clone().json()).resolves.toEqual(BOOKING);
  });

  it("times out once without retrying the booking POST", async () => {
    const fetch = vi.fn((request: Request) => new Promise<Response>((_resolve, reject) => {
      request.signal.addEventListener("abort", () => reject(new DOMException(
        "Timed out", "AbortError",
      )), { once: true });
    }));
    const client = createApiClient({
      apiBase: "https://api.test",
      businessKey: "bk_test",
      fetch,
      timeoutMs: 1,
    });
    await expect(client.book(BOOKING, "booking-key")).rejects
      .toBeInstanceOf(RequestTimeoutError);
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe("API response validation", () => {
  it.each(["getAirports", "getAirlines"] as const)(
    "rejects a malformed %s response",
    async (method) => {
      const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: { broken: true } }));
      await expect(clientWith(fetch)[method]()).rejects.toThrow(`Invalid ${
        method === "getAirports" ? "airports" : "airlines"
      } response.`);
    },
  );

  it.each(["address", "zipcode"])("rejects a non-string airport %s", async (field) => {
    const airport = {
      id: "airport-1", name: "IAH", code: "IAH",
      address: "2800 N Terminal Rd", zipcode: "77032", [field]: 123,
    };
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data: [airport] }));
    await expect(clientWith(fetch).getAirports()).rejects.toThrow("Invalid airports response.");
  });
});

describe("API errors", () => {
  it.each([
    [401, "UNAUTHORIZED", UnauthorizedError],
    [409, "REQUEST_IN_FLIGHT", RequestInFlightError],
    [429, "RATE_LIMITED", RateLimitedError],
  ])("returns a distinct error for status %s", async (status, code, ErrorType) => {
    const fetch = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code, message: "Stop" } }, status),
    );
    await expect(clientWith(fetch).getBusiness()).rejects.toBeInstanceOf(ErrorType);
  });

  it("parses API errors with and without a field", async () => {
    const withField = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Bad", field: "email" } }, 400),
    );
    await expect(clientWith(withField).getBusiness()).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      field: "email",
      message: "Bad",
    });

    const withoutField = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Bad" } }, 400),
    );
    const error = await clientWith(withoutField).getBusiness().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toHaveProperty("field", undefined);
  });

  it("uses a distinct network error", async () => {
    const fetch = vi.fn(async (_input: Request) => Promise.reject(new TypeError("offline")));
    await expect(clientWith(fetch).getBusiness()).rejects.toBeInstanceOf(NetworkError);
  });

});

