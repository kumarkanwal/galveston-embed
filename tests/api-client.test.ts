import { describe, expect, it, vi } from "vitest";

import { createApiClient, type TaxiQuoteRequest } from "../src/api/client";
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
};

const QUOTE: TaxiQuoteRequest = {
  service_type: "one_way",
  pickup_date: "2026-10-20",
  pickup_time: "10:00:00",
  passengers: 1,
  luggage: 0,
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
    expect(request?.headers.get("X-Business-Key")).toBe("bk_test");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    expect(request?.url).toBe("https://api.test/v1/public/business");
  });

  it("sends a POST once without automatic retries", async () => {
    const fetch = vi.fn(async (_input: Request) =>
      jsonResponse({ error: { code: "SERVER_ERROR", message: "Unavailable" } }, 503),
    );
    await expect(clientWith(fetch).quote(QUOTE)).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[0];
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("X-Business-Key")).toBe("bk_test");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
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

