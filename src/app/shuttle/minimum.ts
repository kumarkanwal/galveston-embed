import { ApiError } from "../../api/errors";
import type { ShuttleTripForm } from "./types";

const MINIMUM_FALLBACK = "This trip does not meet the minimum passenger requirement.";

export function passengerTotal(form: ShuttleTripForm): number {
  return form.paxAdult + form.paxSenior + form.paxChild;
}

export function minimumMessage(minimum: number): string {
  return `Minimum ${minimum} passengers for this date`;
}

export function minimumPassengerError(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.code !== "MIN_PASSENGERS_NOT_MET") return null;
  return error.message.trim() === "" ? MINIMUM_FALLBACK : error.message;
}
