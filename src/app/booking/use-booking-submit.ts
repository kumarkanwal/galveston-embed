import { useRef, useState } from "preact/hooks";

import type { ApiClient, TaxiBookingResponse } from "../../api/client";
import { IdempotencyKeyManager } from "../../api/idempotency";
import type { TripFormState } from "../trip/types";
import { buildBookingRequest } from "../confirm/build-requests";
import type { ConfirmFormState } from "../confirm/types";
import { bookingFailure, type BookingFailure } from "./booking-error";

interface BookingSubmitOptions {
  carSeats: number;
  client: ApiClient;
  onSuccess: (response: TaxiBookingResponse) => void;
  trip: TripFormState;
  vehicleTypeId: string;
}

export function useBookingSubmit(options: BookingSubmitOptions) {
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const manager = useRef(new IdempotencyKeyManager());
  const inFlight = useRef(false);

  const submit = async (form: ConfirmFormState) => {
    if (inFlight.current) return;
    const body = buildBookingRequest(
      options.trip, options.vehicleTypeId, options.carSeats, form,
    );
    const key = manager.current.getKey(body);
    inFlight.current = true;
    setFailure(null);
    setIsSubmitting(true);
    try {
      options.onSuccess(await options.client.book(body, key));
    } catch (error: unknown) {
      setFailure(bookingFailure(error));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return { failure, isSubmitting, resetFailure: () => setFailure(null), submit };
}
