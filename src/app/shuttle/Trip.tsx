import type { LocationGroup } from "../../api/client";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import { PassengerDropdown } from "./PassengerDropdown";
import type {
  ShuttleTripErrors,
  ShuttleTripForm,
} from "./types";

interface ShuttleTripProps {
  destinationGroups: LocationGroup[];
  errors: ShuttleTripErrors;
  form: ShuttleTripForm;
  formError: string | null;
  loadingDestinations: boolean;
  loadingLocations: boolean;
  minimumDate: string;
  originGroups: LocationGroup[];
  submitting: boolean;
  timeZone: string;
  onSubmit: (event: SubmitEvent) => void;
  update: <Key extends keyof ShuttleTripForm>(key: Key, value: ShuttleTripForm[Key]) => void;
}

function GroupedOptions({ groups }: { groups: LocationGroup[] }) {
  return <>{groups.map((group) => <optgroup label={group.category} key={group.category_id}>
    {group.locations.map((location) => <option value={location.id} key={location.id}>
      {location.name}
    </option>)}
  </optgroup>)}</>;
}

function LocationField(props: {
  disabled: boolean;
  error: string | undefined;
  groups: LocationGroup[];
  id: "fromId" | "toId";
  label: string;
  value: string;
  update: ShuttleTripProps["update"];
}) {
  return <div class="field">
    <label for={props.id}>{props.label}</label>
    <select id={props.id} disabled={props.disabled} value={props.value}
      aria-invalid={props.error !== undefined}
      onChange={(event) => props.update(props.id, event.currentTarget.value)}>
      <option value="">Select {props.label.toLowerCase()}</option>
      <GroupedOptions groups={props.groups} />
    </select>
    <FieldError id={`${props.id}-error`} message={props.error} />
  </div>;
}

export function ShuttleTrip(props: ShuttleTripProps) {
  const steps = ["Trip", "Departures", "Confirm"];
  return <section class="widget">
    <header class="widget-heading"><h1>Reservations</h1><p>Book your shuttle trip below.</p></header>
    <ProgressSteps steps={steps} />
    <form class="shuttle-trip" noValidate onSubmit={props.onSubmit}>
      <div class="field-row">
        <LocationField id="fromId" label="From" groups={props.originGroups}
          disabled={props.loadingLocations} value={props.form.fromId}
          error={props.errors.fromId} update={props.update} />
        <LocationField id="toId" label="To" groups={props.destinationGroups}
          disabled={props.form.fromId === "" || props.loadingDestinations}
          value={props.form.toId} error={props.errors.toId} update={props.update} />
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
