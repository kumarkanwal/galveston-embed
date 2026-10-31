import type { LocationGroup } from "../../api/client";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import { PassengerDropdown } from "./PassengerDropdown";
import { StopPicker } from "./StopPicker";
import { WidgetHeader } from "../shell/WidgetHeader";
import type {
  ShuttleTripErrors,
  ShuttleTripForm,
} from "./types";

interface ShuttleTripProps {
  businessName?: string | undefined;
  destinationGroups: LocationGroup[];
  errors: ShuttleTripErrors;
  form: ShuttleTripForm;
  formError: string | null;
  loadingDestinations: boolean;
  loadingLocations: boolean;
  logoUrl?: string | null | undefined;
  minimumDate: string;
  originGroups: LocationGroup[];
  submitting: boolean;
  timeZone: string;
  onSubmit: (event: SubmitEvent) => void;
  update: <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => void;
}

export function ShuttleTrip(props: ShuttleTripProps) {
  const steps = ["Trip", "Departures", "Confirm"];
  return <section class="widget">
    <WidgetHeader businessName={props.businessName} logoUrl={props.logoUrl}
      subtitle="Book your shuttle trip below." />
    <ProgressSteps steps={steps} />
    <form class="shuttle-trip" noValidate onSubmit={props.onSubmit}>
      <div class="field-row">
        <StopPicker id="fromId" label="From" groups={props.originGroups}
          disabled={props.loadingLocations} value={props.form.fromId}
          error={props.errors.fromId} onChange={(value) => props.update("fromId", value)} />
        <StopPicker id="toId" label="To" groups={props.destinationGroups}
          disabled={props.form.fromId === "" || props.loadingDestinations}
          value={props.form.toId} error={props.errors.toId}
          onChange={(value) => props.update("toId", value)} />
      </div>
      <div class="field-row">
        <div class="field"><label for="date">Departure Date</label>
          <input id="date" type="date" min={props.minimumDate} value={props.form.date}
            aria-invalid={props.errors.date !== undefined}
            onInput={(event) => props.update("date", event.currentTarget.value)} />
          <FieldError id="date-error" message={props.errors.date} />
        </div>
        <PassengerDropdown error={props.errors.paxAdult} form={props.form}
          update={props.update} />
      </div>
      <div class="trip-kind">
        <label><input type="checkbox" checked={props.form.roundTrip}
          onChange={(event) => props.update("roundTrip", event.currentTarget.checked)} />
          Round trip</label>
      </div>
      {props.form.roundTrip && <div class="field"><label for="returnDate">Return Date</label>
        <input id="returnDate" type="date" min={props.form.date} value={props.form.returnDate}
          aria-invalid={props.errors.returnDate !== undefined}
          onInput={(event) => props.update("returnDate", event.currentTarget.value)} />
        <FieldError id="returnDate-error" message={props.errors.returnDate} />
      </div>}
      <p class="field-note">Dates and times use {props.timeZone}.</p>
      {props.formError !== null && <FormError>{props.formError}</FormError>}
      <button class="check-pricing" type="submit" disabled={props.submitting}>
        {props.submitting ? "Finding Departures…" : "Find Departures"}
      </button>
    </form>
  </section>;
}
