import { ApiError, NetworkError, RateLimitedError } from "../../api/errors";

export interface BreakdownFailure {
  field: "carSeats" | null;
  message: string;
}

export function breakdownFailure(error: unknown): BreakdownFailure {
  if (error instanceof RateLimitedError) {
    return { field: null, message: "Too many requests, please wait a moment and try again." };
  }
  if (error instanceof ApiError && (error.status === 400 || error.status === 422)) {
    return { field: error.field === "car_seats" ? "carSeats" : null, message: error.message };
  }
  if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) {
    return { field: null, message: "Pricing could not be loaded. Please go back and try again." };
  }
  if (error instanceof ApiError) return { field: null, message: error.message };
  return { field: null, message: "Pricing could not be loaded. Please go back and try again." };
}
