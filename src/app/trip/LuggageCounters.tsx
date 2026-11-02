import { FieldError } from "./FieldError";
import { BAG_COUNT_SCHEMA_LIMIT } from "./limits";
import type { TripErrors, TripFormState } from "./types";

interface BagCounts {
  largeBags: number;
  smallBags: number;
}

interface BagCountersProps {
  counts: BagCounts;
  errors: Partial<Record<keyof BagCounts, string>>;
  maximum: number;
  onFieldBlur: (field: keyof BagCounts) => void;
  onChange: (field: keyof BagCounts, value: number) => void;
}

interface LuggageCountersProps {
  errors: TripErrors;
  form: TripFormState;
  maximum: number;
  onFieldBlur: BagCountersProps["onFieldBlur"];
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
  accessibleLabel: string;
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
      aria-label={`${props.accessibleLabel} bags`} aria-invalid={props.error !== undefined}
      aria-describedby={props.error === undefined ? undefined : errorId}>
      <button type="button" aria-label={`Decrease ${props.accessibleLabel} bags`}
        disabled={props.count === 0} onBlur={props.onBlur}
        onClick={() => props.onChange(props.count - 1)}>−</button>
      <output aria-live="polite" aria-label={`${props.count} ${props.accessibleLabel} bags`}>
        {props.count}
      </output>
      <button type="button" aria-label={`Increase ${props.accessibleLabel} bags`}
        disabled={props.disabledUp} onBlur={props.onBlur}
        onClick={() => props.onChange(props.count + 1)}>+</button>
    </div>
    <FieldError id={errorId} message={props.error} />
  </div>;
}

export function BagCounters(props: BagCountersProps) {
  const total = props.counts.largeBags + props.counts.smallBags;
  const disabledUp = total >= props.maximum;
  return <>
    <BagCounter accessibleLabel="Check-in / trunk" count={props.counts.largeBags}
      disabledUp={disabledUp || props.counts.largeBags >= BAG_COUNT_SCHEMA_LIMIT}
      error={props.errors.largeBags} field="largeBags" label="Bags"
      smallIcon={false} onBlur={() => props.onFieldBlur("largeBags")}
      onChange={(value) => props.onChange("largeBags", value)} />
    <BagCounter accessibleLabel="Carry-on" count={props.counts.smallBags}
      disabledUp={disabledUp || props.counts.smallBags >= BAG_COUNT_SCHEMA_LIMIT}
      error={props.errors.smallBags} field="smallBags" label="Carry-on"
      smallIcon onBlur={() => props.onFieldBlur("smallBags")}
      onChange={(value) => props.onChange("smallBags", value)} />
  </>;
}

export function LuggageCounters(props: LuggageCountersProps) {
  return <BagCounters counts={props.form} errors={props.errors} maximum={props.maximum}
    onFieldBlur={props.onFieldBlur}
    onChange={(field, value) => props.update(field, value)} />;
}
