import { AddressField } from "../trip/AddressField";
import type { SelectedAddress } from "../trip/types";
import type { ShuttleAddressField, ShuttleAddressValues } from "./address";
import { requiredShuttleAddresses } from "./address";
import type { ShuttleSelection } from "./types";

interface ShuttleAddressFieldsProps {
  errorField: ShuttleAddressField | null;
  mapsKey: string;
  onChange: (field: ShuttleAddressField, value: SelectedAddress | null) => void;
  selection: ShuttleSelection;
  values: ShuttleAddressValues;
}

const ADDRESS_ERROR = "Choose a street address or airport.";

function AddressControl(props: ShuttleAddressFieldsProps & {
  field: ShuttleAddressField;
  id: string;
  label: string;
}) {
  return <AddressField id={props.id} label={props.label} mapsKey={props.mapsKey}
    dataConfirmField="address" required value={props.values[props.field]}
    error={props.errorField === props.field ? ADDRESS_ERROR : undefined}
    onBlur={() => undefined}
    onChange={(value) => props.onChange(props.field, value)} />;
}

function AddressGroup(props: ShuttleAddressFieldsProps & {
  direction: "outbound" | "return";
}) {
  const pickup = `${props.direction}Pickup` as ShuttleAddressField;
  const dropoff = `${props.direction}Dropoff` as ShuttleAddressField;
  const required = requiredShuttleAddresses(props.selection);
  if (!required.includes(pickup) && !required.includes(dropoff)) return null;
  return <fieldset class="shuttle-addresses">
    {props.selection.returnLeg !== null && <legend>
      {props.direction === "outbound" ? "Outbound addresses" : "Return addresses"}
    </legend>}
    {required.includes(pickup) && <AddressControl {...props} field={pickup}
      id={`shuttle-${props.direction}-pickup-address`} label="Pickup address" />}
    {required.includes(dropoff) && <AddressControl {...props} field={dropoff}
      id={`shuttle-${props.direction}-dropoff-address`} label="Drop-off address" />}
  </fieldset>;
}

export function ShuttleAddressFields(props: ShuttleAddressFieldsProps) {
  return <>
    <AddressGroup {...props} direction="outbound" />
    {props.selection.returnLeg !== null && <AddressGroup {...props} direction="return" />}
  </>;
}
