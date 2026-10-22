import { FieldError } from "./FieldError";
import { BAG_COUNT_SCHEMA_LIMIT } from "./limits";
import type { TripErrors, TripFormState } from "./types";

interface LuggageCountersProps {
  errors: TripErrors;
  form: TripFormState;
  maximum: number;
  onFieldBlur: (field: "largeBags" | "smallBags") => void;
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function BagIcon({ small }: { small: boolean }) {
  return <svg class="bag-icon" viewBox="0 0 32 32" aria-hidden="true">
    <path d={small
      ? "M10 10V8a6 6 0 0 1 12 0v2h3v18H7V10h3Zm4 0h4V8a2 2 0 0 0-4 0v2Z"
      : "M9 8V6a7 7 0 0 1 14 0v2h4v21H5V8h4Zm5 0h4V6a2 2 0 0 0-4 0v2Z"} />
  </svg>;
}

interface CounterProps {
  count: number;
  disabledUp: boolean;
  error: string | undefined;
  field: "largeBags" | "smallBags";
  label: string;
  smallIcon: boolean;
  onBlur: () => void;
  onChange: (value: number) => void;
}

function BagCounter(props: CounterProps) {
  const errorId = `${props.field}-error`;
  return <div class="bag-counter field" data-trip-field={props.field}>
    <div class="bag-label"><BagIcon small={props.smallIcon} /><span>{props.label}</span></div>
    <div class="counter-controls" id={props.field} role="group"
      aria-label={`${props.label} bags`} aria-invalid={props.error !== undefined}
      aria-describedby={props.error === undefined ? undefined : errorId}>
      <button type="button" aria-label={`Decrease ${props.label} bags`}
        disabled={props.count === 0} onBlur={props.onBlur}
        onClick={() => props.onChange(props.count - 1)}>−</button>
      <output aria-live="polite" aria-label={`${props.count} ${props.label} bags`}>
        {props.count}
      </output>
      <button type="button" aria-label={`Increase ${props.label} bags`}
        disabled={props.disabledUp} onBlur={props.onBlur}
        onClick={() => props.onChange(props.count + 1)}>+</button>
    </div>
    <FieldError id={errorId} message={props.error} />
  </div>;
}

export function LuggageCounters(props: LuggageCountersProps) {
  const total = props.form.largeBags + props.form.smallBags;
  const disabledUp = total >= props.maximum;
  return <fieldset class="bag-fields">
    <legend>Luggage</legend>
    <div class="field-row">
      <BagCounter count={props.form.largeBags}
        disabledUp={disabledUp || props.form.largeBags >= BAG_COUNT_SCHEMA_LIMIT}
        error={props.errors.largeBags} field="largeBags" label="Check-in / trunk"
        smallIcon={false} onBlur={() => props.onFieldBlur("largeBags")}
        onChange={(value) => props.update("largeBags", value)} />
      <BagCounter count={props.form.smallBags}
        disabledUp={disabledUp || props.form.smallBags >= BAG_COUNT_SCHEMA_LIMIT}
        error={props.errors.smallBags} field="smallBags" label="Carry-on"
        smallIcon onBlur={() => props.onFieldBlur("smallBags")}
        onChange={(value) => props.update("smallBags", value)} />
    </div>
  </fieldset>;
}
