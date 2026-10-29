import { compareWithBusinessNow, meetsAdvanceBookingRequirement } from "../../time";
import { BAG_COUNT_SCHEMA_LIMIT, type PartyLimits } from "./limits";
import type { TripErrors, TripField, TripFormState } from "./types";

const TRIP_FIELD_ORDER: TripField[] = [
  "pickupDate", "pickupTime", "returnDate", "returnTime", "passengers",
  "largeBags", "smallBags", "pickupAddress",
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
  if (form.largeBags < 0 || form.largeBags > BAG_COUNT_SCHEMA_LIMIT) {
    errors.largeBags = "Select a valid check-in bag count.";
  }
  if (form.smallBags < 0 || form.smallBags > BAG_COUNT_SCHEMA_LIMIT) {
    errors.smallBags = "Select a valid carry-on bag count.";
  }
  if (form.largeBags + form.smallBags > limits.bags) {
    errors.largeBags = `Select no more than ${limits.bags} bags in total.`;
  }
}

function validateAddresses(form: TripFormState, errors: TripErrors): void {
  if (form.service !== "airport_pickup" && form.pickupAddress === null) {
    errors.pickupAddress = "Please choose a street address or airport.";
  }
  if (form.service !== "airport_dropoff" && form.dropoffAddress === null) {
    errors.dropoffAddress = "Please choose a street address or airport.";
  }
}

function validateAirport(form: TripFormState, errors: TripErrors): void {
  if (form.service === "one_way" || form.service === "round_trip") return;
  if (form.service === "airport_pickup" && form.pickupAirportId === "") {
    errors.pickupAirportId = "Select a pickup airport.";
  }
  if (form.service === "airport_dropoff" && form.dropoffAirportId === "") {
    errors.dropoffAirportId = "Select a dropoff airport.";
  }
  if (form.airline === null) errors.airline = "Select an airline.";
  if (form.flightNumber.trim() === "") errors.flightNumber = "Enter a flight number.";
}

function validateReturnDateTime(form: TripFormState, errors: TripErrors): void {
  if (form.service !== "round_trip") return;
  if (form.returnDate === "") errors.returnDate = "Select a return date.";
  if (form.returnTime === "") errors.returnTime = "Select a return time.";
  if (form.returnDate === "" || form.returnTime === ""
    || form.pickupDate === "" || form.pickupTime === "") return;
  const pickup = `${form.pickupDate}T${form.pickupTime}`;
  const returning = `${form.returnDate}T${form.returnTime}`;
  if (returning <= pickup) errors.returnTime = "Return must be after pickup.";
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
  validateReturnDateTime(form, errors);
  validateParty(form, errors, context.limits);
  validateAddresses(form, errors);
  validateAirport(form, errors);
  return errors;
}

export function firstTripError(errors: TripErrors): TripField | null {
  return TRIP_FIELD_ORDER.find((field) => errors[field] !== undefined) ?? null;
}
