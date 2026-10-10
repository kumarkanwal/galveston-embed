import type { Airline, Airport } from "../../api/client";
import type { ServiceTypeOption } from "../../api/service-types";

export const CORE_SERVICE_CODES = [
  "one_way",
  "airport_pickup",
  "airport_dropoff",
] as const;

export type CoreServiceCode = (typeof CORE_SERVICE_CODES)[number];
export type CoreService = ServiceTypeOption & { code: CoreServiceCode };

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface SelectedAddress {
  address: string;
  zipcode: string | null;
  location: MapPoint;
}

export interface TripFormState {
  service: CoreServiceCode;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  luggage: number;
  pickupAddress: SelectedAddress | null;
  dropoffAddress: SelectedAddress | null;
  pickupAirportId: string;
  dropoffAirportId: string;
  airline: Airline | null;
  flightNumber: string;
}

export type TripField =
  | "pickupDate"
  | "pickupTime"
  | "passengers"
  | "luggage"
  | "pickupAddress"
  | "dropoffAddress"
  | "pickupAirportId"
  | "dropoffAirportId"
  | "airline"
  | "flightNumber";

export type TripErrors = Partial<Record<TripField, string>>;
export interface AirportData {
  airports: Airport[];
  airlines: Airline[];
}
