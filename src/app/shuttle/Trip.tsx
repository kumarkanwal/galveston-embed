import type { LocationGroup } from "../../api/client";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import type {
  PassengerPriceFlags,
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
  priceFlags: PassengerPriceFlags;
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

function CountField(props: {
  error: string | undefined;
  id: "paxAdult" | "paxSenior" | "paxChild";
  label: string;
  value: number;
  update: ShuttleTripProps["update"];
}) {
  return <div class="field passenger-field">
    <label for={props.id}>{props.label}</label>
    <input id={props.id} type="number" min="0" max="99" value={props.value}
      aria-invalid={props.error !== undefined}
      onInput={(event) => props.update(props.id, Number(event.currentTarget.value))} />
    <FieldError id={`${props.id}-error`} message={props.error} />
  </div>;
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
        <CountField id="paxAdult" label="Adults" value={props.form.paxAdult}
          error={props.errors.paxAdult} update={props.update} />
      </div>
      {(props.priceFlags.senior || props.priceFlags.child) && <div class="field-row">
        {props.priceFlags.senior && <CountField id="paxSenior" label="Seniors"
          value={props.form.paxSenior} error={undefined} update={props.update} />}
        {props.priceFlags.child && <CountField id="paxChild" label="Children"
          value={props.form.paxChild} error={undefined} update={props.update} />}
      </div>}
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
