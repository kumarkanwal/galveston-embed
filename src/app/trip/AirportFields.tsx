import type { Airline, Airport } from "../../api/client";
import { AirlineCombobox } from "./AirlineCombobox";
import { FieldError } from "./FieldError";
import type { TripErrors, TripField, TripFormState } from "./types";
import { useAirportLocation } from "./use-airport-location";

interface AirportFieldsProps {
  airlines: Airline[];
  airports: Airport[];
  errors: TripErrors;
  form: TripFormState;
  mapsKey: string;
  onFieldBlur: (field: TripField) => void;
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function AirportLocationStatus({ status }: {
  status: ReturnType<typeof useAirportLocation>;
}) {
  if (status === "loading") {
    return <small class="field-note" role="status">Locating airport on map…</small>;
  }
  if (status === "error") {
    return <small class="field-note" role="status">
      Airport map location is unavailable. You can still check pricing.
    </small>;
  }
  return null;
}

export function AirportFields(props: AirportFieldsProps) {
  if (props.form.service === "one_way") return null;
  const pickup = props.form.service === "airport_pickup";
  const airportKey = pickup ? "pickupAirportId" : "dropoffAirportId";
  const airportNameKey = pickup ? "pickupAirportName" : "dropoffAirportName";
  const airportLocationKey = pickup ? "pickupAirportLocation" : "dropoffAirportLocation";
  const airportId = props.form[airportKey];
  const airportError = props.errors[airportKey];
  const airport = props.airports.find((item) => item.id === airportId);
  const locationStatus = useAirportLocation(airport, props.mapsKey, (location) => {
    props.update(airportLocationKey, location);
  });
  const chooseAirport = (id: string) => {
    props.update(airportKey, id);
    props.update(airportNameKey, props.airports.find((airport) => airport.id === id)?.name ?? "");
  };
  return <>
    <div class="field full-field">
      <label for="airport">{pickup ? "Pickup Airport" : "Dropoff Airport"}</label>
      <select id="airport" value={airportId} aria-invalid={airportError !== undefined}
        aria-describedby={airportError === undefined ? undefined : "airport-error"}
        onBlur={() => props.onFieldBlur(airportKey)}
        onChange={(event) => chooseAirport(event.currentTarget.value)}>
        <option value="">Select an airport</option>
        {props.airports.map((airport) => <option value={airport.id}>{airport.name}</option>)}
      </select>
      <FieldError id="airport-error" message={airportError} />
      <AirportLocationStatus status={locationStatus} />
    </div>
    <div class="field-row airport-details">
      <AirlineCombobox airlines={props.airlines} value={props.form.airline}
        error={props.errors.airline} onBlur={() => props.onFieldBlur("airline")}
        onChange={(airline) => props.update("airline", airline)} />
      <div class="field">
        <label for="flight-number">Flight #</label>
        <div class="input-with-icon">
          <input id="flight-number" value={props.form.flightNumber} placeholder="(eg. 123)"
            aria-invalid={props.errors.flightNumber !== undefined}
            aria-describedby={props.errors.flightNumber === undefined
              ? undefined : "flight-number-error"}
            onBlur={() => props.onFieldBlur("flightNumber")}
            onInput={(event) => props.update("flightNumber", event.currentTarget.value)} />
          <span aria-hidden="true">#</span>
        </div>
        <FieldError id="flight-number-error" message={props.errors.flightNumber} />
      </div>
    </div>
  </>;
}
