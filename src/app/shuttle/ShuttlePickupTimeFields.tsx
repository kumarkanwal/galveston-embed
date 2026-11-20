import { FieldError } from "../trip/FieldError";
import type { ShuttlePickupTimeErrors, ShuttlePickupTimes } from "./types";

interface PickupTimeFieldProps {
  error: string | undefined;
  field: keyof ShuttlePickupTimes;
  label: string;
  value: string;
  onChange: (field: keyof ShuttlePickupTimes, value: string) => void;
}

function PickupTimeField(props: PickupTimeFieldProps) {
  const id = `${props.field}-pickup-time`;
  const errorId = `${id}-error`;
  return <div class="field shuttle-pickup-field">
    <label for={id}>{props.label}</label>
    <input id={id} type="time" step={900} required value={props.value}
      aria-invalid={props.error !== undefined}
      aria-describedby={props.error === undefined
        ? "pickup-time-description" : `pickup-time-description ${errorId}`}
      onInput={(event) => props.onChange(props.field, event.currentTarget.value)} />
    <FieldError id={errorId} message={props.error} />
  </div>;
}

export function ShuttlePickupTimeFields(props: {
  errors: ShuttlePickupTimeErrors;
  hasReturn: boolean;
  values: ShuttlePickupTimes;
  onChange: (field: keyof ShuttlePickupTimes, value: string) => void;
}) {
  return <section class="shuttle-pickup-times">
    <div class="shuttle-pickup-fields">
      <PickupTimeField field="outbound" label="Pickup time" value={props.values.outbound}
        error={props.errors.outbound} onChange={props.onChange} />
      {props.hasReturn && <PickupTimeField field="return" label="Return pickup time"
        value={props.values.return} error={props.errors.return} onChange={props.onChange} />}
    </div>
    <p class="field-note" id="pickup-time-description">
      We'll call you to confirm your pickup time.
    </p>
  </section>;
}
