import { ApiError } from "../../api/errors";

export const SHUTTLE_UNAVAILABLE_MESSAGE =
  "That route or departure is no longer available. We refreshed the departures; please choose again.";

export function isShuttleAvailabilityError(error: unknown): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  if (error.code === "SCHEDULE_INACTIVE" || error.code === "SEATS_UNAVAILABLE") return true;
  if (error.status === 404 || error.code === "NOT_FOUND") return true;
  return error.status === 409 && error.code !== "REQUEST_IN_FLIGHT";
}
