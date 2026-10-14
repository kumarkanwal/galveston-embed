import { describe, expect, it, vi } from "vitest";

import {
  createApiClient,
  type TaxiPriceBreakdownRequest,
  type TaxiQuoteRequest,
} from "../src/api/client";
import {
  ApiError,
  NetworkError,
  RateLimitedError,
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
  settings: {
    advance_booking_hours: 6,
    insurance_enabled: false,
    insurance_pct: "0.00",
    payment_methods: ["cash"],
    terms_and_conditions: "Arrive ten minutes early.",
  },
};

const QUOTE: TaxiQuoteRequest = {
  service_type: "one_way",
  pickup_date: "2026-10-20",
  pickup_time: "10:00:00",
  passengers: 1,
  luggage: 0,
};

const BREAKDOWN: TaxiPriceBreakdownRequest = {
  ...QUOTE,
  vehicle_type_id: "11111111-1111-1111-1111-111111111111",
  payment_method: "cash",
  car_seats: 0,
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

  it("runtime-validates service types", async () => {
    const data = [
      { id: "1", code: "one_way", name: "One Way Transfer" },
      { id: "2", code: 4, name: "Broken" },
    ];
    const fetch = vi.fn(async (_input: Request) => jsonResponse({ data }));
    await expect(clientWith(fetch).getServiceTypes()).resolves.toEqual([data[0]]);
  });

  it("sends a POST once without automatic retries", async () => {
    const fetch = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code: "SERVER_ERROR", message: "Unavailable" } }, 503),
    );
    await expect(clientWith(fetch).quote(QUOTE)).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe("https://api.test/v1/public/taxi/quote?hide_incapable=true");
    expect(request?.headers.get("X-Business-Key")).toBe("bk_test");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    await expect(request?.clone().json()).resolves.toEqual(QUOTE);
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

