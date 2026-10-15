import { compareWithBusinessNow, meetsAdvanceBookingRequirement } from "../../time";
import type { PartyLimits } from "./limits";
import type { TripErrors, TripField, TripFormState } from "./types";

const TRIP_FIELD_ORDER: TripField[] = [
  "pickupDate", "pickupTime", "passengers", "luggage", "pickupAddress",
  "dropoffAddress", "pickupAirportId", "dropoffAirportId", "airline", "flightNumber",
];

export interface ValidationContext {
  advanceBookingHours: number;
  limits: PartyLimits;
  now: Date;
  timeZone: string;
}

function validateParty(form: TripFormState, errors: TripErrors, limits: PartyLimits): void {
  if (form.passengers < 1 || form.passengers > limits.passengers) {
    errors.passengers = "Select a valid passenger count.";
  }
  if (form.luggage < 0 || form.luggage > limits.luggage) {
    errors.luggage = "Select a valid luggage count.";
  }
}

function validateAddresses(form: TripFormState, errors: TripErrors): void {
  if (form.service !== "airport_pickup" && form.pickupAddress === null) {
    errors.pickupAddress = "Choose a pickup address from the suggestions.";
  }
  if (form.service !== "airport_dropoff" && form.dropoffAddress === null) {
    errors.dropoffAddress = "Choose a dropoff address from the suggestions.";
  }
}

function validateAirport(form: TripFormState, errors: TripErrors): void {
  if (form.service === "one_way") return;
  if (form.service === "airport_pickup" && form.pickupAirportId === "") {
    errors.pickupAirportId = "Select a pickup airport.";
  }
  if (form.service === "airport_dropoff" && form.dropoffAirportId === "") {
    errors.dropoffAirportId = "Select a dropoff airport.";
  }
  if (form.airline === null) errors.airline = "Select an airline.";
  if (form.flightNumber.trim() === "") errors.flightNumber = "Enter a flight number.";
}

function validateDateTime(
  form: TripFormState,
  errors: TripErrors,
  context: ValidationContext,
): void {
  if (form.pickupDate === "") errors.pickupDate = "Select a pickup date.";
  if (form.pickupTime === "") errors.pickupTime = "Select a pickup time.";
  if (form.pickupDate === "" || form.pickupTime === "") return;
  if (compareWithBusinessNow(
    form.pickupDate, form.pickupTime, context.now, context.timeZone,
  ) < 0) {
    errors.pickupTime = "Pickup time cannot be in the past.";
    return;
  }
  if (!meetsAdvanceBookingRequirement(
    form.pickupDate,
    form.pickupTime,
    context.now,
    context.timeZone,
    context.advanceBookingHours,
  )) {
    errors.pickupTime = `You must book at least ${context.advanceBookingHours} hour(s) in advance.`;
  }
}

export function validateTrip(
  form: TripFormState,
  context: ValidationContext,
): TripErrors {
  const errors: TripErrors = {};
  validateDateTime(form, errors, context);
  validateParty(form, errors, context.limits);
  validateAddresses(form, errors);
  validateAirport(form, errors);
  return errors;
}

export function firstTripError(errors: TripErrors): TripField | null {
  return TRIP_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}
