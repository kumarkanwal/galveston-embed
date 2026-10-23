import type {
  ShuttleBookingRequest,
  ShuttleQuoteLeg,
  ShuttleQuoteRequest,
  ShuttleReturnQuery,
  ShuttleSearchQuery,
} from "../../api/client";
import type { ConfirmFormState } from "../confirm/types";
import type { SelectedShuttleLeg, ShuttleSelection, ShuttleTripForm } from "./types";

function passengerCounts(trip: ShuttleTripForm) {
  return {
    pax_adult: trip.paxAdult,
    pax_child: trip.paxChild,
    pax_senior: trip.paxSenior,
  };
}

export function buildShuttleSearchQuery(trip: ShuttleTripForm): ShuttleSearchQuery {
  return {
    from_location_id: trip.fromId,
    to_location_id: trip.toId,
    date: trip.date,
    ...passengerCounts(trip),
  };
}

export function buildReturnQuery(
  trip: ShuttleTripForm,
  outbound: SelectedShuttleLeg,
): ShuttleReturnQuery {
  const base = {
    from_location_id: trip.fromId,
    to_location_id: trip.toId,
    date: trip.returnDate,
    ...passengerCounts(trip),
  };
  if (outbound.kind === "scheduled") {
    return { ...base, outbound_schedule_id: outbound.departure.schedule_id };
  }
  return {
    ...base,
    outbound_route_id: outbound.routeId,
    outbound_vehicle_type_id: outbound.vehicleTypeId,
    outbound_pickup_date: outbound.date,
    outbound_pickup_time: outbound.time,
  };
}

export function buildShuttleLeg(
  selected: SelectedShuttleLeg,
  trip: ShuttleTripForm,
): ShuttleQuoteLeg {
  const counts = passengerCounts(trip);
  if (selected.kind === "scheduled") {
    return { departure_type: "scheduled", schedule_id: selected.departure.schedule_id, ...counts };
  }
  return {
    departure_type: "on_request",
    route_id: selected.routeId,
    vehicle_type_id: selected.vehicleTypeId,
    pickup_date: selected.date,
    pickup_time: selected.time,
    ...counts,
  };
}

export function buildShuttleQuote(
  selection: ShuttleSelection,
  promoCode: string | null,
): ShuttleQuoteRequest {
  const legs = [buildShuttleLeg(selection.outbound, selection.trip)];
  if (selection.returnLeg !== null) legs.push(buildShuttleLeg(selection.returnLeg, selection.trip));
  return {
    legs,
    insurance_selected: false,
    payment_method: "cash",
    ...(promoCode === null ? {} : { promo_code: promoCode }),
  };
}

export function buildShuttleBooking(
  selection: ShuttleSelection,
  form: ConfirmFormState,
  address: string,
  promoCode: string | null,
): ShuttleBookingRequest {
  const quote = buildShuttleQuote(selection, promoCode);
  return {
    legs: quote.legs,
    insurance_selected: false,
    customer: {
      first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      email: form.email.trim(), phone: form.phone.trim() || null,
    },
    comments: form.comments.trim() || null,
    address: address.trim() || null,
    payment: { method: "cash" },
    accepted_terms: form.acceptedTerms,
    ...(promoCode === null ? {} : { promo_code: promoCode }),
  };
}
