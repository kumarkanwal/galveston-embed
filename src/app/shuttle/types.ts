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

export interface OnRequestLeg {
  kind: "on_request";
  date: string;
  time: string;
  routeId: string;
  route: ShuttleRoute;
  vehicleTypeId: string;
  vehicleTypeName: string;
}

export type SelectedShuttleLeg = ScheduledLeg | OnRequestLeg;

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
