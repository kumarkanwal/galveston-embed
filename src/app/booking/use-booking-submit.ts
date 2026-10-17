import { useRef, useState } from "preact/hooks";

import type { ApiClient, TaxiBookingResponse } from "../../api/client";
import { UnauthorizedError } from "../../api/errors";
import { IdempotencyKeyManager } from "../../api/idempotency";
import type { TripFormState } from "../trip/types";
import { buildBookingRequest } from "../confirm/build-requests";
import type { ConfirmFormState } from "../confirm/types";
import { bookingFailure, type BookingFailure } from "./booking-error";

interface BookingSubmitOptions {
  carSeats: number;
  client: ApiClient;
  onSuccess: (response: TaxiBookingResponse) => void;
  promoCode: string | null;
  trip: TripFormState;
  vehicleTypeId: string;
}

export function useBookingSubmit(options: BookingSubmitOptions) {
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const manager = useRef(new IdempotencyKeyManager());
  const inFlight = useRef(false);
  const unauthorizedLogged = useRef(false);

  const submit = async (form: ConfirmFormState) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const body = buildBookingRequest(
      options.trip, options.vehicleTypeId, options.carSeats, form, options.promoCode,
    );
    setFailure(null);
    setIsSubmitting(true);
    try {
      const key = await manager.current.getKey(body);
      options.onSuccess(await options.client.book(body, key));
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError && !unauthorizedLogged.current) {
        unauthorizedLogged.current = true;
        console.error("Galveston booking widget configuration was rejected.");
      }
      setFailure(bookingFailure(error));
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return { failure, isSubmitting, resetFailure: () => setFailure(null), submit };
}
