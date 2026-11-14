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
import type {
  SelectedShuttleLeg,
  ShuttlePickupTimes,
  ShuttleSelection,
  ShuttleTripForm,
} from "./types";

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
    trip_type: trip.roundTrip ? "round_trip" : "one_way",
    ...passengerCounts(trip),
  };
}

export function buildReturnQuery(
  trip: ShuttleTripForm,
  outbound: SelectedShuttleLeg,
): ShuttleReturnQuery {
  const selection = outbound.kind === "scheduled"
    ? { outbound_schedule_id: outbound.departure.schedule_id }
    : {
        outbound_route_id: outbound.car.route_id,
        outbound_vehicle_type_id: outbound.car.vehicle_type_id,
        outbound_pickup_date: outbound.date,
      };
  return {
    from_location_id: trip.fromId,
    to_location_id: trip.toId,
    date: trip.returnDate,
    ...selection,
    ...passengerCounts(trip),
  };
}

export function buildShuttleLeg(
  selected: SelectedShuttleLeg,
  trip: ShuttleTripForm,
  requestedPickupTime: string,
): ShuttleQuoteLeg {
  if (selected.kind === "private") {
    return {
      departure_type: "private",
      route_id: selected.car.route_id,
      vehicle_type_id: selected.car.vehicle_type_id,
      pickup_date: selected.date,
      requested_pickup_time: requestedPickupTime,
      ...passengerCounts(trip),
    };
  }
  return {
    departure_type: "scheduled",
    schedule_id: selected.departure.schedule_id,
    requested_pickup_time: requestedPickupTime,
    ...passengerCounts(trip),
  };
}

export function buildShuttleQuote(
  selection: ShuttleSelection,
  pickupTimes: ShuttlePickupTimes,
  promoCode: string | null,
  paymentMethod: PaymentMethod = "cash",
): ShuttleQuoteRequest {
  const legs = [buildShuttleLeg(selection.outbound, selection.trip, pickupTimes.outbound)];
  if (selection.returnLeg !== null) {
    legs.push(buildShuttleLeg(selection.returnLeg, selection.trip, pickupTimes.return));
  }
  return {
    legs,
    large_bags: selection.trip.largeBags,
    small_bags: selection.trip.smallBags,
    insurance_selected: false,
    payment_method: paymentMethod,
    ...(promoCode === null ? {} : { promo_code: promoCode }),
  };
}

export function buildShuttleBooking(
  selection: ShuttleSelection,
  form: ConfirmFormState,
  addresses: ShuttleAddressValues,
  pickupTimes: ShuttlePickupTimes,
  promoCode: string | null,
  paymentMethod: PaymentMethod = "cash",
): ShuttleBookingRequest {
  const quote = buildShuttleQuote(selection, pickupTimes, promoCode, paymentMethod);
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
    large_bags: selection.trip.largeBags,
    small_bags: selection.trip.smallBags,
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
