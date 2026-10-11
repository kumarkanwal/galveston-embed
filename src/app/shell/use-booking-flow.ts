import { useRef, useState } from "preact/hooks";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiBookingResponse,
  TaxiQuoteResponse,
} from "../../api/client";
import { businessDateTimeParts } from "../../time";
import { buildQuoteRequest } from "../trip/build-quote-request";
import { quoteFailure } from "../trip/quote-error";
import type { CoreServiceCode, TripErrors, TripFormState } from "../trip/types";
import { validateTrip } from "../trip/validation";

export interface BookingFlowState {
  confirmation: { requestQuote: boolean; response: TaxiBookingResponse } | null;
  errors: TripErrors;
  form: TripFormState;
  formError: string | null;
  isSubmitting: boolean;
  quote: TaxiQuoteResponse | null;
  selectedVehicle: QuotedVehicle | null;
  step: 1 | 2 | 3;
}

function initialForm(business: Business, service: CoreServiceCode): TripFormState {
  const now = businessDateTimeParts(new Date(), business.timezone);
  return {
    service,
    pickupDate: now.date,
    pickupTime: now.time,
    passengers: 1,
    luggage: 0,
    pickupAddress: null,
    dropoffAddress: null,
    pickupAirportId: "",
    pickupAirportName: "",
    dropoffAirportId: "",
    dropoffAirportName: "",
    airline: null,
    flightNumber: "",
  };
}

function initialState(business: Business, service: CoreServiceCode): BookingFlowState {
  return {
    confirmation: null,
    errors: {},
    form: initialForm(business, service),
    formError: null,
    isSubmitting: false,
    quote: null,
    selectedVehicle: null,
    step: 1,
  };
}

export function useBookingFlow(client: ApiClient, business: Business, service: CoreServiceCode) {
  const [state, setState] = useState(() => initialState(business, service));
  const requestInFlight = useRef(false);
  const update = <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => {
    setState((current) => ({ ...current,
      confirmation: null,
      errors: { ...current.errors, [key]: undefined },
      form: { ...current.form, [key]: value },
      formError: null,
      quote: null,
      selectedVehicle: null,
    }));
  };
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (requestInFlight.current) return;
    const errors = validateTrip(state.form, { now: new Date(), timeZone: business.timezone,
      advanceBookingHours: business.settings.advance_booking_hours });
    if (Object.keys(errors).length > 0) {
      setState((current) => ({ ...current, errors })); return;
    }
    requestInFlight.current = true;
    const submittedForm = state.form;
    setState((current) => ({ ...current, errors: {}, formError: null, isSubmitting: true }));
    try {
      const quote = await client.quote(buildQuoteRequest(submittedForm));
      setState((current) => current.form === submittedForm
        ? { ...current, isSubmitting: false, quote, step: 2 }
        : { ...current, isSubmitting: false });
    } catch (error: unknown) {
      const failure = quoteFailure(error, submittedForm.service);
      setState((current) => ({ ...current,
        errors: failure.field === null ? current.errors : { [failure.field]: failure.message },
        formError: failure.field === null ? failure.message : null,
        isSubmitting: false,
      }));
    } finally {
      requestInFlight.current = false;
    }
  };
  const back = () => setState((current) => ({ ...current, step: current.step === 3 ? 2 : 1 }));
  const choose = (vehicle: QuotedVehicle) => {
    if (vehicle.quote_status !== "unavailable") setState((current) => (
      { ...current, selectedVehicle: vehicle, step: 3 }));
  };
  const complete = (response: TaxiBookingResponse, requestQuote: boolean) =>
    setState((current) => ({ ...current, confirmation: { requestQuote, response }, quote: null,
      selectedVehicle: null }));
  return { state, update, submit, back, choose, complete };
}
