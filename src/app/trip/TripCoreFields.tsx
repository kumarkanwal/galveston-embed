import { businessDateTimeParts } from "../../time";
import type { PartyLimits } from "./limits";
import type { CoreService, TripErrors, TripFormState } from "./types";

interface TripCoreFieldsProps {
  errors: TripErrors;
  form: TripFormState;
  limits: PartyLimits;
  services: CoreService[];
  timeZone: string;
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function numericOptions(maximum: number, start: number): number[] {
  return Array.from({ length: maximum - start + 1 }, (_, index) => index + start);
}

function DateTimeFields(props: Pick<
  TripCoreFieldsProps,
  "errors" | "form" | "timeZone" | "update"
>) {
  const minimum = businessDateTimeParts(new Date(), props.timeZone);
  const advanceError = props.errors.pickupTime?.startsWith("You must book") === true;
  return <>
    <div class="field-row">
      <div class="field">
        <label for="pickup-date">Pickup Date</label>
        <input id="pickup-date" type="date" value={props.form.pickupDate}
          min={minimum.date} required aria-invalid={props.errors.pickupDate !== undefined}
          onInput={(event) => props.update("pickupDate", event.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="pickup-time">Pickup Time</label>
        <input id="pickup-time" type="time" value={props.form.pickupTime} required
          min={props.form.pickupDate === minimum.date ? minimum.time : undefined}
          aria-invalid={props.errors.pickupTime !== undefined}
          onInput={(event) => props.update("pickupTime", event.currentTarget.value)} />
      </div>
    </div>
    {(props.errors.pickupDate !== undefined || props.errors.pickupTime !== undefined) && <div
      class={advanceError ? "advance-error" : "field-error"} role="alert">
      {props.errors.pickupDate ?? props.errors.pickupTime}
    </div>}
  </>;
}

export function TripCoreFields({
  errors, form, limits, services, timeZone, update,
}: TripCoreFieldsProps) {
  return <>
    <div class="field full-field">
      <label for="service">Service Details</label>
      <select id="service" value={form.service}
        onChange={(event) => update("service", event.currentTarget.value as TripFormState["service"])}>
        {services.map((service) => <option value={service.code}>{service.name}</option>)}
      </select>
    </div>
    <DateTimeFields errors={errors} form={form} timeZone={timeZone} update={update} />
    <div class="field-row">
      <div class="field">
        <label for="passengers">Passengers</label>
        <select id="passengers" value={form.passengers}
          onChange={(event) => update("passengers", Number(event.currentTarget.value))}>
          {numericOptions(limits.passengers, 1).map((count) => <option value={count}>
            {count} {count === 1 ? "passenger" : "passengers"}
          </option>)}
        </select>
      </div>
      <div class="field">
        <label for="luggage">Luggage</label>
        <select id="luggage" value={form.luggage}
          onChange={(event) => update("luggage", Number(event.currentTarget.value))}>
          {numericOptions(limits.luggage, 0).map((count) => <option value={count}>
            {count} luggage
          </option>)}
        </select>
      </div>
    </div>
  </>;
}
