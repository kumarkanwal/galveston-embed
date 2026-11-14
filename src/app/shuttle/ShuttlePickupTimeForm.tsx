import type { Business } from "../../api/client";
import { WidgetHeader } from "../shell/WidgetHeader";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import type {
  ShuttlePickupTimeErrors,
  ShuttlePickupTimes,
  ShuttleSelection,
} from "./types";

interface ShuttlePickupTimeFormProps {
  business: Business;
  busy: boolean;
  errors: ShuttlePickupTimeErrors;
  formError: string | null;
  selection: ShuttleSelection;
  values: ShuttlePickupTimes;
  onBack: () => void;
  onChange: (field: keyof ShuttlePickupTimes, value: string) => void;
  onSubmit: (event: SubmitEvent) => void;
}

interface PickupTimeFieldProps {
  direction: "Outbound" | "Return";
  error: string | undefined;
  id: "outbound-pickup-time" | "return-pickup-time";
  value: string;
  onChange: (value: string) => void;
}

function PickupTimeField(props: PickupTimeFieldProps) {
  const descriptionId = `${props.id}-description`;
  const errorId = `${props.id}-error`;
  return <div class="field shuttle-pickup-field">
    <strong>{props.direction}</strong>
    <label for={props.id}>Pickup time</label>
    <input id={props.id} type="time" step={900} required value={props.value}
      aria-invalid={props.error !== undefined}
      aria-describedby={`${descriptionId}${props.error === undefined ? "" : ` ${errorId}`}`}
      onInput={(event) => props.onChange(event.currentTarget.value)} />
    <p class="field-note" id={descriptionId}>We'll call you to confirm your pickup time.</p>
    <FieldError id={errorId} message={props.error} />
  </div>;
}

export function ShuttlePickupTimeForm(props: ShuttlePickupTimeFormProps) {
  return <section class="widget">
    <WidgetHeader businessName={props.business.name} logoUrl={props.business.logo_url}
      subtitle="Tell us when you would like to be picked up." />
    <ProgressSteps activeStep={3} steps={["Trip", "Departures", "Confirm"]} />
    <form class="shuttle-pickup-form" noValidate onSubmit={props.onSubmit}>
      <h2>Customer pickup time</h2>
      <div class="shuttle-pickup-fields">
        <PickupTimeField direction="Outbound" id="outbound-pickup-time"
          value={props.values.outbound} error={props.errors.outbound}
          onChange={(value) => props.onChange("outbound", value)} />
        {props.selection.returnLeg !== null && <PickupTimeField direction="Return"
          id="return-pickup-time" value={props.values.return} error={props.errors.return}
          onChange={(value) => props.onChange("return", value)} />}
      </div>
      {props.formError !== null && <FormError>{props.formError}</FormError>}
      <div class="departure-navigation">
        <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
        <button class="departure-continue" type="submit" disabled={props.busy}>
          {props.busy ? "Checking…" : "Check price"}
        </button>
      </div>
    </form>
  </section>;
}
