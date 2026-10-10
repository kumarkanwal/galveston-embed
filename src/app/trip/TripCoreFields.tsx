import { MAX_LUGGAGE, MAX_PASSENGERS } from "./limits";
import type { CoreService, TripErrors, TripFormState } from "./types";

interface TripCoreFieldsProps {
  errors: TripErrors;
  form: TripFormState;
  services: CoreService[];
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function numericOptions(maximum: number, start: number): number[] {
  return Array.from({ length: maximum - start + 1 }, (_, index) => index + start);
}

export function TripCoreFields({ errors, form, services, update }: TripCoreFieldsProps) {
  const advanceError = errors.pickupTime?.startsWith("You must book") === true;
  return <>
    <div class="field full-field">
      <label for="service">Service Details</label>
      <select id="service" value={form.service}
        onChange={(event) => update("service", event.currentTarget.value as TripFormState["service"])}>
        {services.map((service) => <option value={service.code}>{service.name}</option>)}
      </select>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="pickup-date">Pickup Date</label>
        <input id="pickup-date" type="date" value={form.pickupDate}
          aria-invalid={errors.pickupDate !== undefined}
          onInput={(event) => update("pickupDate", event.currentTarget.value)} />
      </div>
      <div class="field">
        <label for="pickup-time">Pickup Time</label>
        <input id="pickup-time" type="time" value={form.pickupTime}
          aria-invalid={errors.pickupTime !== undefined}
          onInput={(event) => update("pickupTime", event.currentTarget.value)} />
      </div>
    </div>
    {(errors.pickupDate !== undefined || errors.pickupTime !== undefined) && <div
      class={advanceError ? "advance-error" : "field-error"} role="alert">
      {errors.pickupDate ?? errors.pickupTime}
    </div>}
    <div class="field-row">
      <div class="field">
        <label for="passengers">Passengers</label>
        <select id="passengers" value={form.passengers}
          onChange={(event) => update("passengers", Number(event.currentTarget.value))}>
          {numericOptions(MAX_PASSENGERS, 1).map((count) => <option value={count}>
            {count} {count === 1 ? "passenger" : "passengers"}
          </option>)}
        </select>
      </div>
      <div class="field">
        <label for="luggage">Luggage</label>
        <select id="luggage" value={form.luggage}
          onChange={(event) => update("luggage", Number(event.currentTarget.value))}>
          {numericOptions(MAX_LUGGAGE, 0).map((count) => <option value={count}>
            {count} luggage
          </option>)}
        </select>
      </div>
    </div>
  </>;
}
