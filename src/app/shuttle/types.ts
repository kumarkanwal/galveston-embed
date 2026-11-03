import type {
  LocationOption,
  ShuttleDeparture,
  ShuttleRoute,
  ShuttleSearchResult,
} from "../../api/client";

export interface ShuttleTripForm {
  fromId: string;
  toId: string;
  date: string;
  returnDate: string;
  roundTrip: boolean;
  largeBags: number;
  smallBags: number;
  paxAdult: number;
  paxSenior: number;
  paxChild: number;
}

export type ShuttleTripField = keyof ShuttleTripForm;
export type ShuttleTripErrors = Partial<Record<ShuttleTripField, string>>;

export interface ScheduledLeg {
  kind: "scheduled";
  date: string;
  departure: ShuttleDeparture;
  route: ShuttleRoute;
}

export type SelectedShuttleLeg = ScheduledLeg;

export interface ShuttleSelection {
  trip: ShuttleTripForm;
  from: LocationOption;
  to: LocationOption;
  outbound: SelectedShuttleLeg;
  returnLeg: SelectedShuttleLeg | null;
}

export interface DepartureViewData {
  result: ShuttleSearchResult;
  date: string;
  direction: "outbound" | "return";
}
