import { ApiError } from "../../api/errors";
import type { ShuttlePickupTimeErrors, ShuttlePickupTimes } from "./types";

export const EMPTY_PICKUP_TIMES: ShuttlePickupTimes = { outbound: "", return: "" };

const PICKUP_TIME_PATTERN = /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/;

export function validatePickupTimes(
  values: ShuttlePickupTimes,
  hasReturn: boolean,
): ShuttlePickupTimeErrors {
  const errors: ShuttlePickupTimeErrors = {};
  if (values.outbound === "") errors.outbound = "Enter a pickup time.";
  else if (!PICKUP_TIME_PATTERN.test(values.outbound)) {
    errors.outbound = "Choose a pickup time in 15-minute steps.";
  }
  if (hasReturn && values.return === "") errors.return = "Enter a pickup time.";
  else if (hasReturn && !PICKUP_TIME_PATTERN.test(values.return)) {
    errors.return = "Choose a pickup time in 15-minute steps.";
  }
  return errors;
}

export function pickupTimeError(error: unknown): ShuttlePickupTimeErrors | null {
  if (!(error instanceof ApiError) || error.status !== 422) return null;
  const match = /^legs\.(\d+)\.requested_pickup_time$/.exec(error.field ?? "");
  if (match?.[1] === "0" || error.field === "requested_pickup_time") {
    return { outbound: error.message };
  }
  if (match?.[1] === "1") return { return: error.message };
  return null;
}

export function formatPickupTime(value: string): string {
  const [hourText = "0", minute = "00"] = value.split(":");
  const hour = Number(hourText);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${period}`;
}
