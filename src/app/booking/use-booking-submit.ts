import { useRef, useState } from "preact/hooks";

import type { ApiClient, PaymentMethod, TaxiBookingResponse } from "../../api/client";
import { ApiError, UnauthorizedError } from "../../api/errors";
import { IdempotencyKeyManager } from "../../api/idempotency";
import type { TripFormState } from "../trip/types";
import { buildBookingRequest } from "../confirm/build-requests";
import { withPaymentToken } from "../confirm/payment";
import type { ConfirmFormState } from "../confirm/types";
import { bookingFailure, type BookingFailure } from "./booking-error";

interface BookingSubmitOptions {
  carSeats: number;
  client: ApiClient;
  onSuccess: (
    response: TaxiBookingResponse,
    paymentMethod: PaymentMethod,
    customerEmail: string,
  ) => void;
  onVehicleUnavailable: (message: string) => void;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
  trip: TripFormState;
  tokenizeCard: () => Promise<string>;
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
    const cart = buildBookingRequest(
      options.trip, options.vehicleTypeId, options.carSeats, form, options.promoCode,
      options.paymentMethod,
    );
    setFailure(null);
    setIsSubmitting(true);
    try {
      const key = await manager.current.getKey(cart);
      const body = options.paymentMethod === "online"
        ? withPaymentToken(cart, await options.tokenizeCard())
        : cart;
      options.onSuccess(
        await options.client.book(body, key),
        options.paymentMethod,
        form.email.trim(),
      );
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError && !unauthorizedLogged.current) {
        unauthorizedLogged.current = true;
        console.error("Galveston booking widget configuration was rejected.");
      }
      const nextFailure = bookingFailure(error);
      if (error instanceof ApiError && error.code === "VEHICLE_UNAVAILABLE") {
        options.onVehicleUnavailable(nextFailure.message);
      } else {
        setFailure(nextFailure);
      }
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return { failure, isSubmitting, resetFailure: () => setFailure(null), submit };
}
