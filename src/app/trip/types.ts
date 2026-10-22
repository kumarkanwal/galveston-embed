import type { Airline, Airport, ServiceTypeOption } from "../../api/client";

export const CORE_SERVICE_CODES = [
  "one_way",
  "round_trip",
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
  returnDate: string;
  returnTime: string;
  passengers: number;
  largeBags: number;
  smallBags: number;
  pickupAddress: SelectedAddress | null;
  dropoffAddress: SelectedAddress | null;
  pickupAirportId: string;
  pickupAirportName: string;
  pickupAirportLocation: MapPoint | null;
  dropoffAirportId: string;
  dropoffAirportName: string;
  dropoffAirportLocation: MapPoint | null;
  airline: Airline | null;
  flightNumber: string;
}

export type TripField =
  | "pickupDate"
  | "pickupTime"
  | "returnDate"
  | "returnTime"
  | "passengers"
  | "largeBags"
  | "smallBags"
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
