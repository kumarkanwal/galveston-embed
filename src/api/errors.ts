interface ErrorBody {
  code: string;
  message: string;
  field?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;

  constructor(status: number, body: ErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    if (body.field !== undefined) this.field = body.field;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(body: ErrorBody) {
    super(401, body);
    this.name = "UnauthorizedError";
  }
}

export class RequestInFlightError extends ApiError {
  constructor(body: ErrorBody) {
    super(409, body);
    this.name = "RequestInFlightError";
  }
}

export class RateLimitedError extends ApiError {
  constructor(body: ErrorBody) {
    super(429, body);
    this.name = "RateLimitedError";
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("The booking service could not be reached.", { cause });
    this.name = "NetworkError";
  }
}

export class RequestTimeoutError extends NetworkError {
  constructor(cause: unknown) {
    super(cause);
    this.name = "RequestTimeoutError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorBody(value: unknown, status: number): ErrorBody {
  if (!isRecord(value) || !isRecord(value.error)) return fallbackBody(status);
  const { code, message, field } = value.error;
  if (typeof code !== "string" || typeof message !== "string") return fallbackBody(status);
  if (typeof field === "string") return { code, message, field };
  return { code, message };
}

function fallbackBody(status: number): ErrorBody {
  return {
    code: `HTTP_${status}`,
    message: "The booking service returned an unexpected error.",
  };
}

export function parseApiError(status: number, value: unknown): ApiError {
  const body = errorBody(value, status);
  if (status === 401) return new UnauthorizedError(body);
  if (status === 409 && body.code === "REQUEST_IN_FLIGHT") {
    return new RequestInFlightError(body);
  }
  if (status === 429 && body.code === "RATE_LIMITED") {
    return new RateLimitedError(body);
  }
  return new ApiError(status, body);
}

