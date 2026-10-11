import { useState } from "preact/hooks";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiBookingRequest,
  TaxiQuoteResponse,
} from "../../api/client";
import { ProgressSteps } from "../trip/ProgressSteps";
import type { TripFormState } from "../trip/types";
import { buildBookingRequest } from "./build-requests";
import { Charges } from "./Charges";
import { ConfirmForm } from "./ConfirmForm";
import { TripSummary } from "./TripSummary";
import { usePriceBreakdown } from "./use-price-breakdown";

interface ConfirmProps {
  business: Business;
  client: ApiClient;
  form: TripFormState;
  onBack: () => void;
  quote: TaxiQuoteResponse;
  serviceName: string;
  vehicle: QuotedVehicle;
}

export function Confirm(props: ConfirmProps) {
  const [carSeats, setCarSeats] = useState(0);
  const [booking, setBooking] = useState<TaxiBookingRequest | null>(null);
  const breakdown = usePriceBreakdown(
    props.client, props.form, props.vehicle.vehicle_type_id, carSeats,
  );
  const changeCarSeats = (count: number) => {
    setBooking(null);
    setCarSeats(count);
  };
  return <section class="widget" aria-live="polite">
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps activeStep={3} />
    <div class="confirm-layout">
      <div>
        <TripSummary form={props.form} quote={props.quote}
          serviceName={props.serviceName} vehicle={props.vehicle} />
        <Charges carSeats={carSeats} currency={props.business.currency}
          onCarSeatsChange={changeCarSeats} state={breakdown} />
        <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
      </div>
      <ConfirmForm booking={booking} breakdownReady={breakdown.status === "ready"}
        onChange={() => setBooking(null)} terms={props.business.settings.terms_and_conditions}
        onValid={(form) => setBooking(buildBookingRequest(
          props.form, props.vehicle.vehicle_type_id, carSeats, form,
        ))} />
    </div>
  </section>;
}
