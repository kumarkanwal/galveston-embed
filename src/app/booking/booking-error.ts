import {
  ApiError,
  NetworkError,
  RateLimitedError,
  RequestInFlightError,
} from "../../api/errors";
import type { ConfirmField } from "../confirm/types";

export interface BookingFailure {
  field: ConfirmField | null;
  message: string;
}

const UNKNOWN_OUTCOME = "We couldn't confirm your booking. Please try again — you will not be booked twice.";

const FIELD_MAP: Record<string, ConfirmField> = {
  accepted_terms: "acceptedTerms",
  comments: "comments",
  "customer.email": "email",
  "customer.first_name": "firstName",
  "customer.last_name": "lastName",
  "customer.phone": "phone",
  email: "email",
  first_name: "firstName",
  last_name: "lastName",
  phone: "phone",
};

function apiFailure(error: ApiError): BookingFailure {
  if (error.status >= 500 && error.status !== 503) {
    return { field: null, message: UNKNOWN_OUTCOME };
  }
  const field = error.field === undefined ? null : (FIELD_MAP[error.field] ?? null);
  return { field, message: error.message || "Your booking could not be submitted." };
}

export function bookingFailure(error: unknown): BookingFailure {
  if (error instanceof RequestInFlightError) {
    return { field: null, message: "Your booking is still being processed. Please wait a moment and try again." };
  }
  if (error instanceof RateLimitedError) {
    return { field: null, message: "Too many requests, please wait a moment and try again." };
  }
  if (error instanceof NetworkError) return { field: null, message: UNKNOWN_OUTCOME };
  if (error instanceof ApiError) return apiFailure(error);
  return { field: null, message: UNKNOWN_OUTCOME };
}
