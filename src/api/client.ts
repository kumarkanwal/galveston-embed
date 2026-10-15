import createClient from "openapi-fetch";

import type { components, paths } from "./schema";
import { validateAirlines, validateAirports } from "./airport-data";
import { ApiError, NetworkError, parseApiError, RequestTimeoutError } from "./errors";

export type Business = components["schemas"]["BusinessPublic"];
export type ServiceTypeOption = components["schemas"]["ServiceTypeOption"];
export type Airport = components["schemas"]["AirportOption"];
export type Airline = components["schemas"]["AirlineOption"];
export type TaxiQuoteRequest = components["schemas"]["TaxiQuoteRequest"];
export type TaxiQuoteResponse = components["schemas"]["TaxiQuoteResponse"];
export type QuotedVehicle = components["schemas"]["QuotedVehicle"];
export type TaxiPriceBreakdownRequest = components["schemas"]["TaxiPriceBreakdownRequest"];
export type TaxiPriceBreakdownResponse = components["schemas"]["TaxiPriceBreakdownResponse"];
export type TaxiBookingRequest = components["schemas"]["TaxiBookingRequest"];
export type TaxiBookingResponse = components["schemas"]["TaxiBookingResponse"];
export type BreakdownLine = components["schemas"]["BreakdownLine"];

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

export interface ApiClient {
  getBusiness(): Promise<Business>;
  getServiceTypes(): Promise<ServiceTypeOption[]>;
  getAirports(): Promise<Airport[]>;
  getAirlines(): Promise<Airline[]>;
  quote(body: TaxiQuoteRequest): Promise<TaxiQuoteResponse>;
  priceBreakdown(body: TaxiPriceBreakdownRequest): Promise<TaxiPriceBreakdownResponse>;
  book(body: TaxiBookingRequest, idempotencyKey: string): Promise<TaxiBookingResponse>;
}

export interface ApiClientOptions {
  apiBase: string;
  businessKey: string;
  fetch?: (input: Request) => Promise<Response>;
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function execute<T>(operation: () => Promise<ApiResult<T>>): Promise<T> {
  try {
    const result = await operation();
    if (result.data !== undefined) return result.data;
    throw parseApiError(result.response.status, result.error);
  } catch (error: unknown) {
    if (error instanceof ApiError || error instanceof NetworkError) throw error;
    throw new NetworkError(error);
  }
}

function timeoutFetch(
  fetchRequest: (input: Request) => Promise<Response>,
  timeoutMs: number,
): (input: Request) => Promise<Response> {
  return async (input) => {
    const controller = new AbortController();
    const abort = () => controller.abort(input.signal.reason);
    if (input.signal.aborted) abort();
    else input.signal.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetchRequest(new Request(input, { signal: controller.signal }));
    } catch (error: unknown) {
      if (controller.signal.aborted && !input.signal.aborted) {
        throw new RequestTimeoutError(error);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      input.signal.removeEventListener("abort", abort);
    }
  };
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const fetchRequest = options.fetch ?? ((request: Request) => globalThis.fetch(request));
  const client = createClient<paths>({
    baseUrl: trimTrailingSlash(options.apiBase),
    headers: {
      "Content-Type": "application/json",
      "X-Business-Key": options.businessKey,
    },
    fetch: timeoutFetch(fetchRequest, options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  return {
    async getBusiness() {
      const envelope = await execute(() => client.GET("/v1/public/business"));
      return envelope.data; },
    async getServiceTypes() {
      const envelope = await execute(() => client.GET("/v1/public/taxi/service-types"));
      return envelope.data;
    },
    async getAirports() {
      const envelope = await execute(() => client.GET("/v1/public/taxi/airports"));
      return validateAirports(envelope.data);
    },
    async getAirlines() {
      const envelope = await execute(() => client.GET("/v1/public/taxi/airlines"));
      return validateAirlines(envelope.data);
    },
    async quote(body) {
      const envelope = await execute(() =>
        client.POST("/v1/public/taxi/quote", {
          body,
          params: { query: { hide_incapable: true } },
        }),
      );
      return envelope.data;
    },
    async priceBreakdown(body) {
      const envelope = await execute(() =>
        client.POST("/v1/public/taxi/price-breakdown", { body }),
      );
      return envelope.data;
    },
    async book(body, idempotencyKey) {
      const envelope = await execute(() =>
        client.POST("/v1/public/taxi/booking", { body,
          headers: { "Idempotency-Key": idempotencyKey } }));
      return envelope.data;
    },
  };
}

