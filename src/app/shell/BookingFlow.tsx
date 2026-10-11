import type { ApiClient, Business } from "../../api/client";
import { ConfirmPlaceholder } from "../confirm/ConfirmPlaceholder";
import { filterCoreServices } from "../trip/service-types";
import { TripDetails } from "../trip/TripDetails";
import { ChooseVehicle } from "../vehicle/ChooseVehicle";
import type { ServiceTypeOption } from "../../api/service-types";
import { useBookingFlow } from "./use-booking-flow";

interface BookingFlowProps {
  business: Business;
  client: ApiClient;
  mapsKey: string;
  services: ServiceTypeOption[];
}

export function BookingFlow(props: BookingFlowProps) {
  const services = filterCoreServices(props.services);
  if (services.length === 0) {
    return <section class="widget status" aria-live="polite">
      Online booking is not available. Please contact us.
    </section>;
  }
  const firstService = services[0];
  if (firstService === undefined) return null;
  return <BookingFlowReady {...props} initialService={firstService.code} services={services} />;
}

function BookingFlowReady(props: Omit<BookingFlowProps, "services"> & {
  initialService: ReturnType<typeof filterCoreServices>[number]["code"];
  services: ReturnType<typeof filterCoreServices>;
}) {
  const flow = useBookingFlow(props.client, props.business, props.initialService);
  if (flow.state.step === 2 && flow.state.quote !== null) {
    return <ChooseVehicle business={props.business} quote={flow.state.quote}
      onBack={flow.back} onChoose={flow.choose} />;
  }
  if (flow.state.step === 3 && flow.state.selectedVehicle !== null) {
    return <ConfirmPlaceholder vehicle={flow.state.selectedVehicle} onBack={flow.back} />;
  }
  return <TripDetails client={props.client} errors={flow.state.errors} form={flow.state.form}
    formError={flow.state.formError} isSubmitting={flow.state.isSubmitting}
    mapsKey={props.mapsKey} onSubmit={flow.submit}
    routePolyline={flow.state.quote?.route_polyline ?? null}
    services={props.services} update={flow.update} />;
}
