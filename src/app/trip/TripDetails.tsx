import type { ApiClient } from "../../api/client";
import { AddressField } from "./AddressField";
import { AirportFields } from "./AirportFields";
import { MapPanel } from "./MapPanel";
import { ProgressSteps } from "./ProgressSteps";
import { TripCoreFields } from "./TripCoreFields";
import type { PartyLimits } from "./limits";
import type { CoreService, TripErrors, TripFormState } from "./types";
import { useAirportData } from "./use-airport-data";

interface TripDetailsProps {
  client: ApiClient;
  errors: TripErrors;
  form: TripFormState;
  formError: string | null;
  isSubmitting: boolean;
  limits: PartyLimits;
  mapsKey: string;
  onSubmit: (event: SubmitEvent) => void | Promise<void>;
  routePolyline: string | null;
  services: CoreService[];
  timeZone: string;
  update: <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => void;
}

function AirportAvailability(props: {
  hasAirlines: boolean;
  hasAirports: boolean;
  ready: boolean;
}) {
  if (!props.ready) return null;
  return <>
    {!props.hasAirports && <div class="form-error" role="alert">
      No airports available, please contact us.
    </div>}
    {!props.hasAirlines && <div class="form-error" role="alert">
      No airlines available, please contact us.
    </div>}
  </>;
}

export function tripMapPoints(form: TripFormState) {
  return {
    pickup: form.service === "airport_pickup"
      ? form.pickupAirportLocation
      : form.pickupAddress?.location ?? null,
    dropoff: form.service === "airport_dropoff"
      ? form.dropoffAirportLocation
      : form.dropoffAddress?.location ?? null,
  };
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
    errors={props.errors} form={props.form} mapsKey={props.mapsKey} update={props.update} /> : null;
  const points = tripMapPoints(props.form);

  return <section class="widget" aria-live="polite">
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps />
    <div class="trip-layout">
      <form class="trip-form" noValidate onSubmit={props.onSubmit}>
        <TripCoreFields errors={props.errors} form={props.form}
          limits={props.limits}
          services={props.services} timeZone={props.timeZone} update={props.update} />
        {props.form.service === "one_way" && <>{address("pickup")}{address("dropoff")}</>}
        {props.form.service === "airport_pickup" && <>{airportFields}{address("dropoff")}</>}
        {props.form.service === "airport_dropoff" && <>{address("pickup")}{airportFields}</>}
        {airportData.status === "loading" && <div class="field-note" role="status">
          Loading airports and airlines…
        </div>}
        {airportData.status === "error" && <div class="form-error" role="alert">
          Airport details could not be loaded. Please try again.
        </div>}
        <AirportAvailability ready={readyData !== null}
          hasAirports={hasAirports} hasAirlines={hasAirlines} />
        {props.formError !== null && <div class="form-error" role="alert">
          {props.formError}
        </div>}
        <button class="check-pricing" type="submit" disabled={props.isSubmitting}>
          {props.isSubmitting ? "Checking Pricing…" : "Check Pricing"}
        </button>
      </form>
      <MapPanel mapsKey={props.mapsKey}
        pickup={points.pickup} dropoff={points.dropoff}
        routePolyline={props.routePolyline} />
    </div>
  </section>;
}
