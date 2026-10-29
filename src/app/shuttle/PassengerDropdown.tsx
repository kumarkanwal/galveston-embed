import { useRef, useState } from "preact/hooks";

import { FieldError } from "../trip/FieldError";
import type { PassengerPriceFlags, ShuttleTripForm } from "./types";

const PASSENGER_LIMIT = 99;
type PassengerField = "paxAdult" | "paxSenior" | "paxChild";

interface PassengerDropdownProps {
  error: string | undefined;
  form: ShuttleTripForm;
  priceFlags: PassengerPriceFlags;
  update: <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => void;
}

function PassengerCounter(props: {
  field: PassengerField;
  label: string;
  minimum: number;
  update: PassengerDropdownProps["update"];
  value: number;
}) {
  return <div class="passenger-row">
    <span id={`${props.field}-label`}>{props.label}</span>
    <div class="counter-controls" role="group" aria-labelledby={`${props.field}-label`}>
      <button type="button" aria-label={`Decrease ${props.label}`}
        disabled={props.value <= props.minimum}
        onClick={() => props.update(props.field, props.value - 1)}>−</button>
      <output id={props.field} aria-live="polite">{props.value}</output>
      <button type="button" aria-label={`Increase ${props.label}`}
        disabled={props.value >= PASSENGER_LIMIT}
        onClick={() => props.update(props.field, props.value + 1)}>+</button>
    </div>
  </div>;
}

function passengerLabel(total: number): string {
  return `${total} ${total === 1 ? "passenger" : "passengers"}`;
}

export function PassengerDropdown(props: PassengerDropdownProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const total = props.form.paxAdult + props.form.paxSenior + props.form.paxChild;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault(); close();
  };
  return <div class="field passenger-dropdown" onKeyDown={keyDown}>
    <label for="passenger-trigger">Passengers</label>
    <button id="passenger-trigger" class="passenger-trigger" type="button" ref={trigger}
      aria-haspopup="dialog" aria-expanded={open} aria-controls="passenger-menu"
      aria-invalid={props.error !== undefined} onClick={() => setOpen((current) => !current)}>
      {passengerLabel(total)} <span aria-hidden="true">▾</span>
    </button>
    {open && <div id="passenger-menu" class="passenger-menu" role="dialog"
      aria-label="Passenger counts">
      <PassengerCounter field="paxAdult" label="Adults" minimum={1}
        value={props.form.paxAdult} update={props.update} />
      {props.priceFlags.senior && <PassengerCounter field="paxSenior" label="Seniors" minimum={0}
        value={props.form.paxSenior} update={props.update} />}
      {props.priceFlags.child && <PassengerCounter field="paxChild" label="Children" minimum={0}
        value={props.form.paxChild} update={props.update} />}
    </div>}
    <FieldError id="paxAdult-error" message={props.error} />
  </div>;
}
