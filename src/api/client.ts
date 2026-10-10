import createClient from "openapi-fetch";

import type { components, paths } from "./schema";
import { ApiError, NetworkError, parseApiError } from "./errors";

export type Business = components["schemas"]["BusinessPublic"];
export type TaxiQuoteRequest = components["schemas"]["TaxiQuoteRequest"];
export type TaxiQuoteResponse = components["schemas"]["TaxiQuoteResponse"];

interface ApiResult<T> {
  data?: T;
  error?: unknown;
  response: Response;
}

export interface ApiClient {
  getBusiness(): Promise<Business>;
  quote(body: TaxiQuoteRequest): Promise<TaxiQuoteResponse>;
}

export interface ApiClientOptions {
  apiBase: string;
  businessKey: string;
  fetch?: (input: Request) => Promise<Response>;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

async function execute<T>(operation: () => Promise<ApiResult<T>>): Promise<T> {
  try {
    const result = await operation();
    if (result.data !== undefined) return result.data;
    throw parseApiError(result.response.status, result.error);
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error;
    throw new NetworkError(error);
  }
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const client = createClient<paths>({
    baseUrl: trimTrailingSlash(options.apiBase),
    headers: {
      "Content-Type": "application/json",
      "X-Business-Key": options.businessKey,
    },
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
  });

  return {
    async getBusiness() {
      const envelope = await execute(() => client.GET("/v1/public/business"));
      return envelope.data;
    },
    async quote(body) {
      const envelope = await execute(() =>
        client.POST("/v1/public/taxi/quote", { body }),
      );
      return envelope.data;
    },
  };
}

