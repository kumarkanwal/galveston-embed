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
import type { PartyLimits } from "../trip/limits";
import { quoteFailure } from "../trip/quote-error";
import type { CoreServiceCode, TripErrors, TripField, TripFormState } from "../trip/types";
import { firstTripError, validateTrip } from "../trip/validation";

export interface BookingFlowState {
  confirmation: { requestQuote: boolean; response: TaxiBookingResponse } | null;
  errors: TripErrors;
  errorFocusField: TripField | null;
  errorFocusVersion: number;
  form: TripFormState;
  formError: string | null;
  isSubmitting: boolean;
  quote: TaxiQuoteResponse | null;
  selectedVehicle: QuotedVehicle | null;
  step: 1 | 2 | 3;
  vehicleNotice: string | null;
}

function initialForm(business: Business, service: CoreServiceCode): TripFormState {
  const now = businessDateTimeParts(new Date(), business.timezone);
  return {
    service,
    pickupDate: now.date,
    pickupTime: "",
    returnDate: now.date,
    returnTime: "",
    passengers: 1,
    largeBags: 0,
    smallBags: 0,
    pickupAddress: null,
    dropoffAddress: null,
    pickupAirportId: "",
    pickupAirportName: "",
    pickupAirportLocation: null,
    dropoffAirportId: "",
    dropoffAirportName: "",
    dropoffAirportLocation: null,
    airline: null,
    flightNumber: "",
  };
}

function updatedForm<Key extends keyof TripFormState>(
  form: TripFormState,
  key: Key,
  value: TripFormState[Key],
): TripFormState {
  const updated = { ...form, [key]: value };
  if (key === "service") {
    return { ...updated, pickupAirportLocation: null, dropoffAirportLocation: null };
  }
  if (key === "pickupAirportId") return { ...updated, pickupAirportLocation: null };
  if (key === "dropoffAirportId") return { ...updated, dropoffAirportLocation: null };
  return updated;
}

function initialState(business: Business, service: CoreServiceCode): BookingFlowState {
  return {
    confirmation: null,
    errors: {},
    errorFocusField: null,
    errorFocusVersion: 0,
    form: initialForm(business, service),
    formError: null,
    isSubmitting: false,
    quote: null,
    selectedVehicle: null,
    step: 1,
    vehicleNotice: null,
  };
}

type FlowSetter = (update: (current: BookingFlowState) => BookingFlowState) => void;

function createUpdate(setState: FlowSetter) {
  return <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => {
    setState((current) => ({ ...current,
      confirmation: null,
      errors: { ...current.errors, [key]: undefined },
      form: updatedForm(current.form, key, value),
      formError: null,
      quote: null,
      selectedVehicle: null,
      vehicleNotice: null,
    }));
  };
}

function createBlur(setState: FlowSetter, business: Business, limits: PartyLimits) {
  return (key: TripField) => setState((current) => {
    const nextErrors = validateTrip(current.form, {
      now: new Date(),
      timeZone: business.timezone,
      advanceBookingHours: business.settings.advance_booking_hours,
      limits,
    });
    return { ...current, errors: { ...current.errors, [key]: nextErrors[key] } };
  });
}

function markVehicleUnavailable(
  quote: TaxiQuoteResponse | null,
  vehicleTypeId: string | undefined,
): TaxiQuoteResponse | null {
  if (quote?.vehicles === undefined) return quote;
  const vehicles = quote.vehicles.map((vehicle) => vehicle.vehicle_type_id === vehicleTypeId
    ? { ...vehicle, available: false, quote_status: "unavailable" as const }
    : vehicle);
  return { ...quote, vehicles };
}

function createVehicleUnavailable(setState: FlowSetter) {
  return (message: string) => setState((current) => ({
    ...current,
    quote: markVehicleUnavailable(current.quote, current.selectedVehicle?.vehicle_type_id),
    selectedVehicle: null,
    step: 2,
    vehicleNotice: message,
  }));
}

function createComplete(setState: FlowSetter) {
  return (response: TaxiBookingResponse, requestQuote: boolean) => setState((current) => ({
    ...current, confirmation: { requestQuote, response }, quote: null, selectedVehicle: null,
  }));
}

export function useBookingFlow(client: ApiClient, business: Business,
  service: CoreServiceCode, limits: PartyLimits) {
  const [state, setState] = useState(() => initialState(business, service));
  const requestInFlight = useRef(false);
  const update = createUpdate(setState); const blur = createBlur(setState, business, limits);
  const vehicleUnavailable = createVehicleUnavailable(setState);
  const complete = createComplete(setState);
  const submit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (requestInFlight.current) return;
    const errors = validateTrip(state.form, { now: new Date(), timeZone: business.timezone,
      advanceBookingHours: business.settings.advance_booking_hours, limits });
    if (Object.keys(errors).length > 0) {
      setState((current) => ({ ...current, errors,
        errorFocusField: firstTripError(errors),
        errorFocusVersion: current.errorFocusVersion + 1,
      })); return;
    }
    requestInFlight.current = true;
    const submittedForm = state.form;
    setState((current) => ({ ...current, errors: {}, formError: null, isSubmitting: true }));
    try {
      const quote = await client.quote(buildQuoteRequest(submittedForm));
      setState((current) => current.form === submittedForm
        ? { ...current, isSubmitting: false, quote, step: 2, vehicleNotice: null }
        : { ...current, isSubmitting: false });
    } catch (error: unknown) {
      const failure = quoteFailure(error, submittedForm.service);
      setState((current) => ({ ...current,
        errors: failure.field === null ? current.errors : { [failure.field]: failure.message },
        errorFocusField: failure.field,
        errorFocusVersion: failure.field === null
          ? current.errorFocusVersion
          : current.errorFocusVersion + 1,
        formError: failure.field === null ? failure.message : null,
        isSubmitting: false,
      }));
    } finally {
      requestInFlight.current = false;
    }
  };
  const back = () => setState((current) => ({ ...current,
    step: current.step === 3 ? 2 : 1, vehicleNotice: null }));
  const choose = (vehicle: QuotedVehicle) => {
    if (vehicle.quote_status !== "unavailable") setState((current) => (
      { ...current, selectedVehicle: vehicle, step: 3, vehicleNotice: null }));
  };
  return { state, update, blur, submit, back, choose, complete, vehicleUnavailable };
}
