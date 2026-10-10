import type { TaxiQuoteRequest } from "../../api/client";
import type { TripFormState } from "./types";

function pickupAddress(form: TripFormState): string | null {
  return form.service === "airport_pickup" ? null : form.pickupAddress?.address ?? null;
}

function dropoffAddress(form: TripFormState): string | null {
  return form.service === "airport_dropoff" ? null : form.dropoffAddress?.address ?? null;
}

export function buildQuoteRequest(form: TripFormState): TaxiQuoteRequest {
  const airportService = form.service !== "one_way";
  return {
    service_type: form.service,
    pickup_date: form.pickupDate,
    pickup_time: form.pickupTime,
    pickup_address: pickupAddress(form),
    pickup_zipcode: form.service === "airport_pickup" ? null : form.pickupAddress?.zipcode ?? null,
    dropoff_address: dropoffAddress(form),
    dropoff_zipcode: form.service === "airport_dropoff" ? null : form.dropoffAddress?.zipcode ?? null,
    pickup_airport_id: form.service === "airport_pickup" ? form.pickupAirportId : null,
    dropoff_airport_id: form.service === "airport_dropoff" ? form.dropoffAirportId : null,
    airline: airportService ? form.airline?.name ?? null : null,
    flight_number: airportService ? form.flightNumber : null,
    return_date: null,
    return_time: null,
    hours: null,
    stops: [],
    passengers: form.passengers,
    luggage: form.luggage,
    payment_method: null,
  };
}
