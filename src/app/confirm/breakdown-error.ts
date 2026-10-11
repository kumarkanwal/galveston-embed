import { ApiError, NetworkError, RateLimitedError } from "../../api/errors";

export function breakdownErrorMessage(error: unknown): string {
  if (error instanceof RateLimitedError) {
    return "Too many requests, please wait a moment and try again.";
  }
  if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
    return error.message;
  }
  if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) {
    return "Pricing could not be loaded. Please go back and try again.";
  }
  if (error instanceof ApiError) return error.message;
  return "Pricing could not be loaded. Please go back and try again.";
}
