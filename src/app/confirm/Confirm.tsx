import { useState } from "preact/hooks";

import type {
  ApiClient,
  Business,
  QuotedVehicle,
  TaxiBookingResponse,
  TaxiQuoteResponse,
} from "../../api/client";
import { useBookingSubmit } from "../booking/use-booking-submit";
import { ProgressSteps } from "../trip/ProgressSteps";
import type { TripFormState } from "../trip/types";
import { Charges } from "./Charges";
import { ConfirmForm } from "./ConfirmForm";
import { RequestQuotePrice } from "./RequestQuotePrice";
import { TripSummary } from "./TripSummary";
import { usePriceBreakdown } from "./use-price-breakdown";

interface ConfirmProps {
  business: Business;
  client: ApiClient;
  form: TripFormState;
  onBack: () => void;
  onBooked: (response: TaxiBookingResponse, requestQuote: boolean) => void;
  quote: TaxiQuoteResponse;
  serviceName: string;
  vehicle: QuotedVehicle;
}

export function Confirm(props: ConfirmProps) {
  const [carSeats, setCarSeats] = useState(0);
  const requestQuote = props.vehicle.quote_status === "request_quote";
  const breakdown = usePriceBreakdown(
    props.client, props.form, props.vehicle.vehicle_type_id, carSeats, !requestQuote,
  );
  const booking = useBookingSubmit({
    carSeats,
    client: props.client,
    onSuccess: (response) => props.onBooked(response, requestQuote),
    trip: props.form,
    vehicleTypeId: props.vehicle.vehicle_type_id,
  });
  const changeCarSeats = (count: number) => {
    booking.resetFailure();
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
        {requestQuote
          ? <RequestQuotePrice carSeats={carSeats} onCarSeatsChange={changeCarSeats}
            outOfServiceArea={props.quote.out_of_service_area} />
          : <Charges carSeats={carSeats} currency={props.business.currency}
            onCarSeatsChange={changeCarSeats} state={breakdown} />}
        <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
      </div>
      <ConfirmForm breakdownReady={requestQuote || breakdown.status === "ready"}
        buttonLabel={requestQuote ? "Request Quote" : "Create Trip"}
        failure={booking.failure} isSubmitting={booking.isSubmitting}
        onChange={booking.resetFailure} onValid={booking.submit}
        terms={props.business.settings.terms_and_conditions} />
    </div>
  </section>;
}
