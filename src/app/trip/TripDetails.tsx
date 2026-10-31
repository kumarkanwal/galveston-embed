import { useEffect, useRef } from "preact/hooks";

import type { ApiClient } from "../../api/client";
import { AddressField } from "./AddressField";
import { AirportFields } from "./AirportFields";
import { MapPanel } from "./MapPanel";
import { ProgressSteps } from "./ProgressSteps";
import { TripCoreFields } from "./TripCoreFields";
import { FormError } from "./FieldError";
import type { PartyLimits } from "./limits";
import type {
  CoreService,
  CoreServiceCode,
  TripErrors,
  TripField,
  TripFormState,
} from "./types";
import { useAirportData } from "./use-airport-data";
import { WidgetHeader } from "../shell/WidgetHeader";

interface TripDetailsProps {
  autoFocusHeading?: boolean;
  businessName?: string | undefined;
  client: ApiClient;
  errors: TripErrors;
  errorFocusField?: TripField | null;
  errorFocusVersion?: number;
  form: TripFormState;
  formError: string | null;
  isSubmitting: boolean;
  limits: PartyLimits;
  logoUrl?: string | null | undefined;
  mapsKey: string;
  onFieldBlur: (field: TripField) => void;
  onSubmit: (event: SubmitEvent) => void | Promise<void>;
  routePolyline: string | null;
  roundTripAlternative: CoreServiceCode | null;
  services: CoreService[];
  showMap: boolean;
  showServiceDropdown: boolean;
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
    {!props.hasAirports && <FormError>No airports available, please contact us.</FormError>}
    {!props.hasAirlines && <FormError>No airlines available, please contact us.</FormError>}
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

function tripEndpointLabel(form: TripFormState, kind: "pickup" | "dropoff"): string {
  if (kind === "pickup" && form.service === "airport_pickup") {
    return form.pickupAirportName || "Not selected";
  }
  if (kind === "dropoff" && form.service === "airport_dropoff") {
    return form.dropoffAirportName || "Not selected";
  }
  return form[`${kind}Address`]?.address ?? "Not selected";
}

const TRIP_FIELD_IDS: Record<TripField, string> = {
  airline: "airline", dropoffAddress: "dropoff-address", dropoffAirportId: "airport",
  flightNumber: "flight-number", largeBags: "largeBags", passengers: "passengers",
  pickupAddress: "pickup-address", pickupAirportId: "airport",
  pickupDate: "pickup-date", pickupTime: "pickup-time", returnDate: "return-date",
  returnTime: "return-time", smallBags: "smallBags",
};

function useTripFocus(
  props: TripDetailsProps,
  formRef: { current: HTMLFormElement | null },
  headingRef: { current: HTMLHeadingElement | null },
) {
  useEffect(() => {
    if (props.autoFocusHeading) headingRef.current?.focus();
  }, [headingRef, props.autoFocusHeading]);
  useEffect(() => {
    if ((props.errorFocusVersion ?? 0) === 0 || props.errorFocusField == null) return;
    const id = TRIP_FIELD_IDS[props.errorFocusField];
    formRef.current?.querySelector<HTMLElement>(`#${id}`)?.focus();
  }, [formRef, props.errorFocusField, props.errorFocusVersion]);
}

function tripAddressField(props: TripDetailsProps, kind: "pickup" | "dropoff") {
  return <AddressField id={`${kind}-address`}
    label={`${kind === "pickup" ? "Pickup" : "Dropoff"} Address`}
    mapsKey={props.mapsKey} value={props.form[`${kind}Address`]}
    error={props.errors[`${kind}Address`]}
    onBlur={() => props.onFieldBlur(`${kind}Address`)}
    onChange={(value) => props.update(`${kind}Address`, value)} />;
}

function TripMap(props: TripDetailsProps & { points: ReturnType<typeof tripMapPoints> }) {
  if (!props.showMap) return null;
  return <MapPanel mapsKey={props.mapsKey} pickup={props.points.pickup}
    dropoff={props.points.dropoff} pickupLabel={tripEndpointLabel(props.form, "pickup")}
    dropoffLabel={tripEndpointLabel(props.form, "dropoff")}
    routePolyline={props.routePolyline} />;
}

export function TripDetails(props: TripDetailsProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const airportData = useAirportData(props.client, props.form.service);
  useTripFocus(props, formRef, headingRef);
  const readyData = airportData.status === "ready" ? airportData.data : null;
  const hasAirports = readyData !== null && readyData.airports.length > 0;
  const hasAirlines = readyData !== null && readyData.airlines.length > 0;
  const airportService = props.form.service === "airport_pickup" || props.form.service === "airport_dropoff";
  const airportFields = airportService && hasAirports && hasAirlines ? <AirportFields
    airports={readyData.airports} airlines={readyData.airlines}
    errors={props.errors} form={props.form} onFieldBlur={props.onFieldBlur}
    mapsKey={props.mapsKey} update={props.update} /> : null;
  const points = tripMapPoints(props.form);
  return <section class="widget">
    <WidgetHeader businessName={props.businessName} headingRef={headingRef}
      logoUrl={props.logoUrl}
      subtitle="Book a trip or request a quote by filling out the form below." />
    <ProgressSteps />
    <div class={`trip-layout${props.showMap ? "" : " no-map"}`}>
      <form class="trip-form" ref={formRef} noValidate onSubmit={props.onSubmit}>
        <TripCoreFields errors={props.errors} form={props.form} onFieldBlur={props.onFieldBlur}
          limits={props.limits} roundTripAlternative={props.roundTripAlternative}
          services={props.services} showServiceDropdown={props.showServiceDropdown}
          timeZone={props.timeZone} update={props.update} />
        {(props.form.service === "one_way" || props.form.service === "round_trip")
          && <>{tripAddressField(props, "pickup")}
          {tripAddressField(props, "dropoff")}</>}
        {props.form.service === "airport_pickup" && <>{airportFields}
          {tripAddressField(props, "dropoff")}</>}
        {props.form.service === "airport_dropoff" && <>{tripAddressField(props, "pickup")}
          {airportFields}</>}
        {airportData.status === "loading" && <div class="field-note" role="status">
          Loading airports and airlines…
        </div>}
        {airportData.status === "error" && <FormError>
          Airport details could not be loaded. Please try again.
        </FormError>}
        <AirportAvailability ready={readyData !== null} hasAirports={hasAirports}
          hasAirlines={hasAirlines} />
        {props.formError !== null && <FormError>{props.formError}</FormError>}
        <button class="check-pricing" type="submit" disabled={props.isSubmitting}>
          {props.isSubmitting ? "Checking Pricing…" : "Check Pricing"}
        </button>
      </form>
      <TripMap {...props} points={points} />
    </div>
  </section>;
}
