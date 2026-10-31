import { businessDateTimeParts } from "../../time";
import { SelectControl } from "../shell/FieldChevron";
import { FieldError } from "./FieldError";
import { LuggageCounters } from "./LuggageCounters";
import type { PartyLimits } from "./limits";
import type {
  CoreService,
  CoreServiceCode,
  TripErrors,
  TripField,
  TripFormState,
} from "./types";

interface TripCoreFieldsProps {
  errors: TripErrors;
  form: TripFormState;
  limits: PartyLimits;
  onFieldBlur: (field: TripField) => void;
  roundTripAlternative: CoreServiceCode | null;
  services: CoreService[];
  showServiceDropdown: boolean;
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
  return <div class="field-row compact-row date-time-grid pickup-datetime-fields">
    <div class="field" data-trip-field="pickupDate">
        <label for="pickup-date">Pickup Date</label>
        <input id="pickup-date" type="date" value={props.form.pickupDate}
          min={minimum.date} required aria-invalid={props.errors.pickupDate !== undefined}
          aria-describedby={props.errors.pickupDate === undefined ? undefined : "pickup-date-error"}
          onBlur={() => props.onFieldBlur("pickupDate")}
          onInput={(event) => props.update("pickupDate", event.currentTarget.value)} />
        <FieldError id="pickup-date-error" message={props.errors.pickupDate} />
      </div>
      <div class="field" data-trip-field="pickupTime">
        <label for="pickup-time">Pickup Time</label>
        <input id="pickup-time" type="time" value={props.form.pickupTime} required
          min={props.form.pickupDate === minimum.date ? minimum.time : undefined}
          aria-invalid={props.errors.pickupTime !== undefined}
          aria-describedby={props.errors.pickupTime === undefined ? undefined : "pickup-time-error"}
          onBlur={() => props.onFieldBlur("pickupTime")}
          onInput={(event) => props.update("pickupTime", event.currentTarget.value)} />
        <FieldError id="pickup-time-error" message={props.errors.pickupTime} />
    </div>
  </div>;
}

function ReturnDateTimeFields(props: Pick<
  TripCoreFieldsProps,
  "errors" | "form" | "onFieldBlur" | "update"
>) {
  if (props.form.service !== "round_trip") return null;
  return <div class="field-row date-time-grid return-fields">
    <div class="field" data-trip-field="returnDate">
      <label for="return-date">Return Date</label>
      <input id="return-date" type="date" value={props.form.returnDate}
        min={props.form.pickupDate || undefined} required
        aria-invalid={props.errors.returnDate !== undefined}
        aria-describedby={props.errors.returnDate === undefined ? undefined : "return-date-error"}
        onBlur={() => props.onFieldBlur("returnDate")}
        onInput={(event) => props.update("returnDate", event.currentTarget.value)} />
      <FieldError id="return-date-error" message={props.errors.returnDate} />
    </div>
    <div class="field" data-trip-field="returnTime">
      <label for="return-time">Return Time</label>
      <input id="return-time" type="time" value={props.form.returnTime} required
        min={props.form.returnDate === props.form.pickupDate ? props.form.pickupTime : undefined}
        aria-invalid={props.errors.returnTime !== undefined}
        aria-describedby={props.errors.returnTime === undefined ? undefined : "return-time-error"}
        onBlur={() => props.onFieldBlur("returnTime")}
        onInput={(event) => props.update("returnTime", event.currentTarget.value)} />
      <FieldError id="return-time-error" message={props.errors.returnTime} />
    </div>
  </div>;
}

function ServiceControl(props: Pick<
  TripCoreFieldsProps,
  "form" | "roundTripAlternative" | "services" | "showServiceDropdown" | "update"
>) {
  if (props.showServiceDropdown) {
    return <div class="field full-field">
      <label for="service">Service Details</label>
      <SelectControl><select id="service" value={props.form.service}
        onChange={(event) => props.update(
          "service", event.currentTarget.value as TripFormState["service"],
        )}>
        {props.services.map((service) => <option value={service.code}>{service.name}</option>)}
      </select></SelectControl>
    </div>;
  }
  const alternative = props.roundTripAlternative;
  if (alternative === null) return null;
  const roundTrip = props.form.service === "round_trip";
  return <div class="trip-kind-toggle" role="group" aria-label="Trip type">
    <button type="button" aria-pressed={!roundTrip}
      onClick={() => props.update("service", alternative)}>
      One way
    </button>
    <button type="button" aria-pressed={roundTrip}
      onClick={() => props.update("service", "round_trip")}>Round trip</button>
  </div>;
}

export function TripCoreFields({
  errors, form, limits, onFieldBlur, roundTripAlternative, services,
  showServiceDropdown, timeZone, update,
}: TripCoreFieldsProps) {
  return <>
    <ServiceControl form={form} roundTripAlternative={roundTripAlternative} services={services}
      showServiceDropdown={showServiceDropdown} update={update} />
    <DateTimeFields errors={errors} form={form} onFieldBlur={onFieldBlur}
      timeZone={timeZone} update={update} />
    <ReturnDateTimeFields errors={errors} form={form} onFieldBlur={onFieldBlur} update={update} />
    <fieldset class="compact-row party-fields">
      <legend class="visually-hidden">Passengers and luggage</legend>
      <div class="field" data-trip-field="passengers">
        <label for="passengers">Passengers</label>
        <SelectControl><select id="passengers" value={form.passengers}
          aria-invalid={errors.passengers !== undefined}
          aria-describedby={errors.passengers === undefined ? undefined : "passengers-error"}
          onBlur={() => onFieldBlur("passengers")}
          onChange={(event) => update("passengers", Number(event.currentTarget.value))}>
          {numericOptions(limits.passengers, 1).map((count) => <option value={count}>
            {count} {count === 1 ? "passenger" : "passengers"}
          </option>)}
        </select></SelectControl>
        <FieldError id="passengers-error" message={errors.passengers} />
      </div>
      <LuggageCounters errors={errors} form={form} maximum={limits.bags}
        onFieldBlur={onFieldBlur} update={update} />
    </fieldset>
  </>;
}
