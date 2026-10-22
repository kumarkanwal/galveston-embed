import { ApiError, NetworkError, RateLimitedError } from "../../api/errors";
import type { CoreServiceCode, TripField } from "./types";

const FIELD_NAMES: Partial<Record<string, TripField>> = {
  pickup_date: "pickupDate",
  pickup_time: "pickupTime",
  return_date: "returnDate",
  return_time: "returnTime",
  passengers: "passengers",
  large_bags: "largeBags",
  small_bags: "smallBags",
  pickup_address: "pickupAddress",
  pickup_zipcode: "pickupAddress",
  dropoff_address: "dropoffAddress",
  dropoff_zipcode: "dropoffAddress",
  pickup_airport_id: "pickupAirportId",
  dropoff_airport_id: "dropoffAirportId",
  airline: "airline",
  flight_number: "flightNumber",
};

export interface QuoteFailure {
  field: TripField | null;
  message: string;
}

function visibleField(field: string | undefined, service: CoreServiceCode): TripField | null {
  if (field === "pickup_address" && service === "airport_pickup") return "pickupAirportId";
  if (field === "dropoff_address" && service === "airport_dropoff") return "dropoffAirportId";
  return field === undefined ? null : FIELD_NAMES[field] ?? null;
}

export function quoteFailure(error: unknown, service: CoreServiceCode): QuoteFailure {
  if (error instanceof RateLimitedError) {
    return { field: null, message: "Too many requests, please wait a moment and try again." };
  }
  if (error instanceof ApiError && error.status === 400) {
    const field = visibleField(error.field, service);
    return { field, message: error.message };
  }
  if (error instanceof ApiError && error.status === 422) {
    return { field: null, message: error.message };
  }
  if (error instanceof NetworkError || (error instanceof ApiError && error.status >= 500)) {
    return { field: null, message: "Pricing could not be loaded. Please try again." };
  }
  if (error instanceof ApiError) return { field: null, message: error.message };
  return { field: null, message: "Pricing could not be loaded. Please try again." };
}
