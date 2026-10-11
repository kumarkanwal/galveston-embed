import type {
  TaxiBookingRequest,
  TaxiPriceBreakdownRequest,
} from "../../api/client";
import { buildQuoteRequest } from "../trip/build-quote-request";
import type { TripFormState } from "../trip/types";
import type { ConfirmFormState } from "./types";

export function buildBreakdownRequest(
  form: TripFormState,
  vehicleTypeId: string,
  carSeats: number,
): TaxiPriceBreakdownRequest {
  return {
    ...buildQuoteRequest(form),
    vehicle_type_id: vehicleTypeId,
    payment_method: "cash",
    car_seats: carSeats,
  };
}

export function buildBookingRequest(
  trip: TripFormState,
  vehicleTypeId: string,
  carSeats: number,
  form: ConfirmFormState,
): TaxiBookingRequest {
  const { payment_method: _paymentMethod, ...journey } = buildQuoteRequest(trip);
  return {
    ...journey,
    vehicle_type_id: vehicleTypeId,
    car_seats: carSeats,
    customer: {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
    },
    comments: form.comments.trim() || null,
    payment: { method: "cash" },
    accepted_terms: form.acceptedTerms,
  };
}
