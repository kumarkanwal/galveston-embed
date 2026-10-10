import type { ApiClient } from "../../api/client";
import { AddressField } from "./AddressField";
import { AirportFields } from "./AirportFields";
import { MapPanel } from "./MapPanel";
import { ProgressSteps } from "./ProgressSteps";
import { TripCoreFields } from "./TripCoreFields";
import type { CoreService, TripErrors, TripFormState } from "./types";
import { useAirportData } from "./use-airport-data";

interface TripDetailsProps {
  client: ApiClient;
  errors: TripErrors;
  form: TripFormState;
  mapsKey: string;
  onSubmit: (event: SubmitEvent) => void;
  services: CoreService[];
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

export function TripDetails(props: TripDetailsProps) {
  const airportData = useAirportData(props.client, props.form.service);
  const address = (kind: "pickup" | "dropoff") => <AddressField
    id={`${kind}-address`} label={`${kind === "pickup" ? "Pickup" : "Dropoff"} Address`}
    mapsKey={props.mapsKey} value={props.form[`${kind}Address`]}
    error={props.errors[`${kind}Address`]}
    onChange={(value) => props.update(`${kind}Address`, value)} />;
  const readyData = airportData.status === "ready" ? airportData.data : null;
  const hasAirports = readyData !== null && readyData.airports.length > 0;
  const hasAirlines = readyData !== null && readyData.airlines.length > 0;
  const airportFields = hasAirports && hasAirlines ? <AirportFields
    airports={readyData.airports} airlines={readyData.airlines}
    errors={props.errors} form={props.form} update={props.update} /> : null;

  return <section class="widget" aria-live="polite">
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps />
    <div class="trip-layout">
      <form class="trip-form" noValidate onSubmit={props.onSubmit}>
        <TripCoreFields errors={props.errors} form={props.form}
          services={props.services} update={props.update} />
        {props.form.service === "one_way" && <>{address("pickup")}{address("dropoff")}</>}
        {props.form.service === "airport_pickup" && <>{airportFields}{address("dropoff")}</>}
        {props.form.service === "airport_dropoff" && <>{address("pickup")}{airportFields}</>}
        {airportData.status === "loading" && <div class="field-note" role="status">
          Loading airports and airlines…
        </div>}
        {airportData.status === "error" && <div class="form-error" role="alert">
          Airport details could not be loaded. Please try again.
        </div>}
        {readyData !== null && !hasAirports && <div class="form-error" role="alert">
          No airports available, please contact us.
        </div>}
        {readyData !== null && !hasAirlines && <div class="form-error" role="alert">
          No airlines available, please contact us.
        </div>}
        <button class="check-pricing" type="submit">Check Pricing</button>
      </form>
      <MapPanel mapsKey={props.mapsKey}
        pickup={props.form.pickupAddress?.location ?? null}
        dropoff={props.form.dropoffAddress?.location ?? null} />
    </div>
  </section>;
}
