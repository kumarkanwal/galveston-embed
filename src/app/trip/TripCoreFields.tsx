import { businessDateTimeParts } from "../../time";
import { FieldError } from "./FieldError";
import type { PartyLimits } from "./limits";
import type { CoreService, TripErrors, TripField, TripFormState } from "./types";

interface TripCoreFieldsProps {
  errors: TripErrors;
  form: TripFormState;
  limits: PartyLimits;
  onFieldBlur: (field: TripField) => void;
  services: CoreService[];
  timeZone: string;
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function numericOptions(maximum: number, start: number): number[] {
  return Array.from({ length: maximum - start + 1 }, (_, index) => index + start);
}

function DateTimeFields(props: Pick<
  TripCoreFieldsProps,
  "errors" | "form" | "onFieldBlur" | "timeZone" | "update"
>) {
  const minimum = businessDateTimeParts(new Date(), props.timeZone);
  return <>
    <div class="field-row">
      <div class="field">
        <label for="pickup-date">Pickup Date</label>
        <input id="pickup-date" type="date" value={props.form.pickupDate}
          min={minimum.date} required aria-invalid={props.errors.pickupDate !== undefined}
          aria-describedby={props.errors.pickupDate === undefined ? undefined : "pickup-date-error"}
          onBlur={() => props.onFieldBlur("pickupDate")}
          onInput={(event) => props.update("pickupDate", event.currentTarget.value)} />
        <FieldError id="pickup-date-error" message={props.errors.pickupDate} />
      </div>
      <div class="field">
        <label for="pickup-time">Pickup Time</label>
        <input id="pickup-time" type="time" value={props.form.pickupTime} required
          min={props.form.pickupDate === minimum.date ? minimum.time : undefined}
          aria-invalid={props.errors.pickupTime !== undefined}
          aria-describedby={props.errors.pickupTime === undefined ? undefined : "pickup-time-error"}
          onBlur={() => props.onFieldBlur("pickupTime")}
          onInput={(event) => props.update("pickupTime", event.currentTarget.value)} />
        <FieldError id="pickup-time-error" message={props.errors.pickupTime} />
      </div>
    </div>
  </>;
}

export function TripCoreFields({
  errors, form, limits, onFieldBlur, services, timeZone, update,
}: TripCoreFieldsProps) {
  return <>
    <div class="field full-field">
      <label for="service">Service Details</label>
      <select id="service" value={form.service}
        onChange={(event) => update("service", event.currentTarget.value as TripFormState["service"])}>
        {services.map((service) => <option value={service.code}>{service.name}</option>)}
      </select>
    </div>
    <DateTimeFields errors={errors} form={form} onFieldBlur={onFieldBlur}
      timeZone={timeZone} update={update} />
    <div class="field-row">
      <div class="field">
        <label for="passengers">Passengers</label>
        <select id="passengers" value={form.passengers}
          aria-invalid={errors.passengers !== undefined}
          aria-describedby={errors.passengers === undefined ? undefined : "passengers-error"}
          onBlur={() => onFieldBlur("passengers")}
          onChange={(event) => update("passengers", Number(event.currentTarget.value))}>
          {numericOptions(limits.passengers, 1).map((count) => <option value={count}>
            {count} {count === 1 ? "passenger" : "passengers"}
          </option>)}
        </select>
        <FieldError id="passengers-error" message={errors.passengers} />
      </div>
      <div class="field">
        <label for="luggage">Luggage</label>
        <select id="luggage" value={form.luggage}
          aria-invalid={errors.luggage !== undefined}
          aria-describedby={errors.luggage === undefined ? undefined : "luggage-error"}
          onBlur={() => onFieldBlur("luggage")}
          onChange={(event) => update("luggage", Number(event.currentTarget.value))}>
          {numericOptions(limits.luggage, 0).map((count) => <option value={count}>
            {count} luggage
          </option>)}
        </select>
        <FieldError id="luggage-error" message={errors.luggage} />
      </div>
    </div>
  </>;
}
