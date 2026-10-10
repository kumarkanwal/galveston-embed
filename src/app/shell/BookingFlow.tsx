import { useState } from "preact/hooks";

import type { ApiClient, Business } from "../../api/client";
import { businessDateTimeParts } from "../../time";
import { buildQuoteRequest } from "../trip/build-quote-request";
import { filterCoreServices } from "../trip/service-types";
import { TripDetails } from "../trip/TripDetails";
import type {
  CheckPricingHandler,
  TripErrors,
  TripFormState,
} from "../trip/types";
import { validateTrip } from "../trip/validation";
import type { ServiceTypeOption } from "../../api/service-types";

interface BookingFlowProps {
  business: Business;
  client: ApiClient;
  mapsKey: string;
  onCheckPricing: CheckPricingHandler;
  services: ServiceTypeOption[];
}

function initialForm(business: Business, service: TripFormState["service"]): TripFormState {
  const now = businessDateTimeParts(new Date(), business.timezone);
  return {
    service,
    pickupDate: now.date,
    pickupTime: now.time,
    passengers: 1,
    luggage: 0,
    pickupAddress: null,
    dropoffAddress: null,
    pickupAirportId: "",
    dropoffAirportId: "",
    airline: null,
    flightNumber: "",
  };
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
  initialService: TripFormState["service"];
  services: ReturnType<typeof filterCoreServices>;
}) {
  const [form, setForm] = useState(() => initialForm(props.business, props.initialService));
  const [errors, setErrors] = useState<TripErrors>({});
  const update = <Key extends keyof TripFormState>(key: Key, value: TripFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const nextErrors = validateTrip(form, {
      advanceBookingHours: props.business.settings?.advance_booking_hours ?? 0,
      now: new Date(),
      timeZone: props.business.timezone,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      props.onCheckPricing(buildQuoteRequest(form));
    }
  };
  return <TripDetails client={props.client} errors={errors} form={form}
    mapsKey={props.mapsKey} onSubmit={submit} services={props.services} update={update} />;
}
