import type { ApiClient, Business, ServiceTypeOption } from "../../api/client";
import { useEffect, useRef } from "preact/hooks";
import { Confirmation } from "../booking/Confirmation";
import { Confirm } from "../confirm/Confirm";
import { filterCoreServices } from "../trip/service-types";
import { TripDetails } from "../trip/TripDetails";
import { ChooseVehicle } from "../vehicle/ChooseVehicle";
import { partyLimits, type PartyLimits } from "../trip/limits";
import { useBookingFlow } from "./use-booking-flow";

interface BookingFlowProps {
  business: Business;
  client: ApiClient;
  mapsKey: string;
  services: ServiceTypeOption[];
}
export function BookingFlow(props: BookingFlowProps) {
  const services = filterCoreServices(props.services);
  const limits = partyLimits(props.business);
  if (limits === null) {
    return <section class="widget status" aria-live="polite">
      No vehicles are available. Please contact us.
    </section>;
  }
  if (services.length === 0) {
    return <section class="widget status" aria-live="polite">
      Online booking is not available. Please contact us.
    </section>;
  }
  const firstService = services[0];
  if (firstService === undefined) return null;
  return <BookingFlowReady {...props} initialService={firstService.code}
    limits={limits} services={services} />;
}

function BookingFlowReady(props: Omit<BookingFlowProps, "services"> & {
  initialService: ReturnType<typeof filterCoreServices>[number]["code"];
  limits: PartyLimits;
  services: ReturnType<typeof filterCoreServices>;
}) {
  const flow = useBookingFlow(props.client, props.business, props.initialService, props.limits);
  const view = flow.state.confirmation !== null ? "confirmation" : `step-${flow.state.step}`;
  const previousView = useRef(view);
  const autoFocusHeading = previousView.current !== view;
  useEffect(() => { previousView.current = view; }, [view]);
  if (flow.state.confirmation !== null) {
    return <Confirmation autoFocusHeading={autoFocusHeading} currency={props.business.currency}
      requestQuote={flow.state.confirmation.requestQuote}
      response={flow.state.confirmation.response} />;
  }
  if (flow.state.step === 2 && flow.state.quote !== null) {
    return <ChooseVehicle autoFocusHeading={autoFocusHeading}
      business={props.business} quote={flow.state.quote}
      notice={flow.state.vehicleNotice} onBack={flow.back} onChoose={flow.choose} />;
  }
  if (flow.state.step === 3 && flow.state.selectedVehicle !== null) {
    const vehicle = flow.state.selectedVehicle;
    const service = props.services.find((candidate) => candidate.code === flow.state.form.service);
    if (flow.state.quote === null || service === undefined) return null;
    return <Confirm autoFocusHeading={autoFocusHeading}
      business={props.business} client={props.client} form={flow.state.form}
      onBack={flow.back} onBooked={flow.complete} quote={flow.state.quote}
      onVehicleUnavailable={flow.vehicleUnavailable}
      serviceName={service.name} vehicle={vehicle} />;
  }
  return <TripDetails client={props.client} errors={flow.state.errors} form={flow.state.form}
    autoFocusHeading={autoFocusHeading} errorFocusField={flow.state.errorFocusField}
    errorFocusVersion={flow.state.errorFocusVersion}
    formError={flow.state.formError} isSubmitting={flow.state.isSubmitting}
    mapsKey={props.mapsKey} onSubmit={flow.submit}
    limits={props.limits}
    routePolyline={flow.state.quote?.route_polyline ?? null}
    services={props.services} timeZone={props.business.timezone}
    onFieldBlur={flow.blur} update={flow.update} />;
}
