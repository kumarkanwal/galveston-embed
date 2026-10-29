import type {
  PaymentMethod,
  ShuttleBookingLeg,
  ShuttleBookingRequest,
  ShuttleQuoteLeg,
  ShuttleQuoteRequest,
  ShuttleReturnQuery,
  ShuttleSearchQuery,
} from "../../api/client";
import type { ConfirmFormState } from "../confirm/types";
import { requiredShuttleAddresses, type ShuttleAddressValues } from "./address";
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
  paymentMethod: PaymentMethod = "cash",
): ShuttleQuoteRequest {
  const legs = [buildShuttleLeg(selection.outbound, selection.trip)];
  if (selection.returnLeg !== null) legs.push(buildShuttleLeg(selection.returnLeg, selection.trip));
  return {
    legs,
    insurance_selected: false,
    payment_method: paymentMethod,
    ...(promoCode === null ? {} : { promo_code: promoCode }),
  };
}

export function buildShuttleBooking(
  selection: ShuttleSelection,
  form: ConfirmFormState,
  addresses: ShuttleAddressValues,
  promoCode: string | null,
  paymentMethod: PaymentMethod = "cash",
): ShuttleBookingRequest {
  const quote = buildShuttleQuote(selection, promoCode, paymentMethod);
  const required = requiredShuttleAddresses(selection);
  const legs: ShuttleBookingLeg[] = quote.legs.map((leg, index) => {
    const pickupField = index === 0 ? "outboundPickup" : "returnPickup";
    const dropoffField = index === 0 ? "outboundDropoff" : "returnDropoff";
    const pickup = required.includes(pickupField) ? addresses[pickupField] : null;
    const dropoff = required.includes(dropoffField) ? addresses[dropoffField] : null;
    return { ...leg,
      pickup_address: pickup?.address.trim() || null,
      dropoff_address: dropoff?.address.trim() || null };
  });
  return {
    legs,
    insurance_selected: false,
    customer: {
      first_name: form.firstName.trim(), last_name: form.lastName.trim(),
      email: form.email.trim(), phone: form.phone.trim() || null,
    },
    comments: form.comments.trim() || null,
    payment: { method: paymentMethod },
    accepted_terms: form.acceptedTerms,
    ...(promoCode === null ? {} : { promo_code: promoCode }),
  };
}
