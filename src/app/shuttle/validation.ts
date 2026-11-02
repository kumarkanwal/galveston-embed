import { BAG_COUNT_SCHEMA_LIMIT } from "../trip/limits";
import type { ShuttleTripErrors, ShuttleTripForm } from "./types";

export function validateShuttleTrip(
  form: ShuttleTripForm,
  minimumDate: string,
  maximumBags = BAG_COUNT_SCHEMA_LIMIT * 2,
): ShuttleTripErrors {
  const errors: ShuttleTripErrors = {};
  if (form.fromId === "") errors.fromId = "Select where you are leaving from.";
  if (form.toId === "") errors.toId = "Select where you are going.";
  if (form.date === "") errors.date = "Select a departure date.";
  else if (form.date < minimumDate) errors.date = "Departure date cannot be in the past.";
  if (form.paxAdult + form.paxSenior + form.paxChild < 1) {
    errors.paxAdult = "Select at least one passenger.";
  }
  if (form.largeBags < 0 || form.largeBags > BAG_COUNT_SCHEMA_LIMIT) {
    errors.largeBags = "Select a valid check-in bag count.";
  }
  if (form.smallBags < 0 || form.smallBags > BAG_COUNT_SCHEMA_LIMIT) {
    errors.smallBags = "Select a valid carry-on bag count.";
  }
  if (form.largeBags + form.smallBags > maximumBags) {
    errors.largeBags = `Select no more than ${maximumBags} bags in total.`;
  }
  if (form.roundTrip && form.returnDate === "") {
    errors.returnDate = "Select a return date.";
  } else if (form.roundTrip && form.returnDate < form.date) {
    errors.returnDate = "Return date must be on or after the departure date.";
  }
  return errors;
}

export function hasShuttleTripErrors(errors: ShuttleTripErrors): boolean {
  return Object.keys(errors).length > 0;
}
