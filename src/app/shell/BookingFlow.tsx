import type { ApiClient, Business, ServiceTypeOption } from "../../api/client";
import { useEffect, useRef } from "preact/hooks";
import { Confirmation } from "../booking/Confirmation";
import { Confirm } from "../confirm/Confirm";
import { filterCoreServices, firstNonRoundTripService } from "../trip/service-types";
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
  const showServiceDropdown = props.business.settings.show_service_dropdown !== false;
  if (limits === null) {
    return <section class="widget status" aria-live="polite">
      No vehicles are available. Please contact us.
    </section>;
  }
  const hiddenDefault = firstNonRoundTripService(services);
  if (services.length === 0 || (!showServiceDropdown && hiddenDefault === undefined)) {
    return <section class="widget status" aria-live="polite">
      Online booking is not available. Please contact us.
    </section>;
  }
  const firstService = showServiceDropdown ? services[0] : hiddenDefault;
  if (firstService === undefined) return null;
  return <BookingFlowReady {...props} initialService={firstService.code}
    limits={limits} roundTripAlternative={!showServiceDropdown
      && services.some((service) => service.code === "round_trip") ? firstService.code : null}
    services={services} showServiceDropdown={showServiceDropdown} />;
}

function BookingFlowReady(props: Omit<BookingFlowProps, "services"> & {
  initialService: ReturnType<typeof filterCoreServices>[number]["code"];
  limits: PartyLimits;
  roundTripAlternative: ReturnType<typeof filterCoreServices>[number]["code"] | null;
  services: ReturnType<typeof filterCoreServices>;
  showServiceDropdown: boolean;
}) {
  const flow = useBookingFlow(props.client, props.business, props.initialService, props.limits);
  const view = flow.state.confirmation !== null ? "confirmation" : `step-${flow.state.step}`;
  const previousView = useRef(view);
  const autoFocusHeading = previousView.current !== view;
  useEffect(() => { previousView.current = view; }, [view]);
  if (flow.state.confirmation !== null) {
    return <Confirmation autoFocusHeading={autoFocusHeading} currency={props.business.currency}
      requestQuote={flow.state.confirmation.requestQuote}
      paymentMethod={flow.state.confirmation.paymentMethod}
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
    roundTripAlternative={props.roundTripAlternative}
    services={props.services} timeZone={props.business.timezone}
    showMap={props.business.settings.show_map !== false}
    showServiceDropdown={props.showServiceDropdown}
    onFieldBlur={flow.blur} update={flow.update} />;
}
