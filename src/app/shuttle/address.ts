import type { SelectedAddress } from "../trip/types";
import type { ShuttleSelection } from "./types";

export type ShuttleAddressField =
  | "outboundPickup"
  | "outboundDropoff"
  | "returnPickup"
  | "returnDropoff";

export type ShuttleAddressValues = Record<ShuttleAddressField, SelectedAddress | null>;

export interface ShuttleAddressState {
  returnDropoffEdited: boolean;
  returnPickupEdited: boolean;
  values: ShuttleAddressValues;
}

export function initialShuttleAddresses(): ShuttleAddressState {
  return {
    returnDropoffEdited: false,
    returnPickupEdited: false,
    values: {
      outboundDropoff: null, outboundPickup: null,
      returnDropoff: null, returnPickup: null,
    },
  };
}

export function shuttleAddressRouteKey(selection: ShuttleSelection): string {
  const returnRoute = selection.returnLeg?.route.id ?? "one-way";
  return `${selection.from.id}:${selection.to.id}:${selection.outbound.route.id}:${returnRoute}`;
}

export function addressesAfterRouteChange(
  state: ShuttleAddressState,
  previousRoute: string,
  nextRoute: string,
): ShuttleAddressState {
  return previousRoute === nextRoute ? state : initialShuttleAddresses();
}

export function requiredShuttleAddresses(selection: ShuttleSelection): ShuttleAddressField[] {
  const fields: ShuttleAddressField[] = [];
  if (selection.outbound.route.from_requires_address) fields.push("outboundPickup");
  if (selection.outbound.route.to_requires_address) fields.push("outboundDropoff");
  if (selection.returnLeg?.route.from_requires_address) fields.push("returnPickup");
  if (selection.returnLeg?.route.to_requires_address) fields.push("returnDropoff");
  return fields;
}

export function updateShuttleAddress(
  state: ShuttleAddressState,
  field: ShuttleAddressField,
  value: SelectedAddress | null,
): ShuttleAddressState {
  const values = { ...state.values, [field]: value };
  if (field === "outboundPickup" && !state.returnDropoffEdited) values.returnDropoff = value;
  if (field === "outboundDropoff" && !state.returnPickupEdited) values.returnPickup = value;
  return {
    returnDropoffEdited: state.returnDropoffEdited || field === "returnDropoff",
    returnPickupEdited: state.returnPickupEdited || field === "returnPickup",
    values,
  };
}
