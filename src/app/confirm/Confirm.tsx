import { useEffect, useRef, useState } from "preact/hooks";
import type { RefObject } from "preact";

import type {
  ApiClient,
  Business,
  PaymentMethod,
  QuotedVehicle,
  TaxiBookingResponse,
  TaxiQuoteResponse,
} from "../../api/client";
import { useBookingSubmit } from "../booking/use-booking-submit";
import type { BookingFailure } from "../booking/booking-error";
import { ProgressSteps } from "../trip/ProgressSteps";
import type { TripFormState } from "../trip/types";
import { Charges } from "./Charges";
import { ConfirmForm } from "./ConfirmForm";
import { cardPaymentSettings } from "./payment";
import { PaymentMethodField } from "./PaymentMethodField";
import { RequestQuotePrice } from "./RequestQuotePrice";
import { TripSummary } from "./TripSummary";
import { usePriceBreakdown, type BreakdownState } from "./use-price-breakdown";

interface ConfirmProps {
  autoFocusHeading?: boolean;
  business: Business;
  client: ApiClient;
  form: TripFormState;
  onBack: () => void;
  onBooked: (response: TaxiBookingResponse, requestQuote: boolean) => void;
  onVehicleUnavailable: (message: string) => void;
  quote: TaxiQuoteResponse;
  serviceName: string;
  vehicle: QuotedVehicle;
}

function carSeatErrorFor(
  breakdown: BreakdownState,
  failure: BookingFailure | null,
): string | undefined {
  if (failure?.field === "carSeats") return failure.message;
  return breakdown.status === "error" && breakdown.field === "carSeats"
    ? breakdown.message
    : undefined;
}

function promoErrorFor(
  error: string | undefined,
  failure: BookingFailure | null,
): string | undefined {
  return failure?.field === "promoCode" ? failure.message : error;
}

function isPriceFieldFailure(failure: BookingFailure | null): boolean {
  return failure?.field === "carSeats" || failure?.field === "promoCode";
}

function useConfirmFocus(
  sectionRef: RefObject<HTMLElement | null>,
  autoFocusHeading: boolean | undefined,
  carSeatError: string | undefined,
  promoError: string | undefined,
) {
  useEffect(() => {
    if (autoFocusHeading) sectionRef.current?.querySelector<HTMLElement>(".trip-summary h2")?.focus();
  }, [autoFocusHeading, sectionRef]);
  useEffect(() => {
    if (carSeatError !== undefined) {
      sectionRef.current?.querySelector<HTMLElement>('[data-confirm-field="carSeats"]')?.focus();
    }
  }, [carSeatError, sectionRef]);
  useEffect(() => {
    if (promoError !== undefined) {
      sectionRef.current?.querySelector<HTMLElement>('[data-confirm-field="promoCode"]')?.focus();
    }
  }, [promoError, sectionRef]);
}

function useConfirmController(props: ConfirmProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [carSeats, setCarSeats] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const carSeatMax = props.business.settings.offer_car_seats ? props.business.settings.max_car_seats : 0;
  const requestQuote = props.vehicle.quote_status === "request_quote";
  const cardAvailable = !requestQuote && cardPaymentSettings(props.business) !== null;
  const pricing = usePriceBreakdown(
    props.client, props.form, props.vehicle.vehicle_type_id, carSeats, !requestQuote,
    paymentMethod,
  );
  const booking = useBookingSubmit({
    carSeats,
    client: props.client,
    onSuccess: (response) => props.onBooked(response, requestQuote),
    onVehicleUnavailable: props.onVehicleUnavailable,
    paymentMethod,
    promoCode: pricing.promo.appliedCode,
    trip: props.form,
    vehicleTypeId: props.vehicle.vehicle_type_id,
  });
  const changeCarSeats = (count: number) => { booking.resetFailure(); setCarSeats(count); };
  const changePromo = (value: string) => { booking.resetFailure(); pricing.setPromoInput(value); };
  const changePayment = (method: PaymentMethod) => {
    booking.resetFailure();
    setPaymentMethod(method);
  };
  const applyPromo = () => { booking.resetFailure(); void pricing.applyPromo(); };
  const removePromo = () => { booking.resetFailure(); void pricing.removePromo(); };
  const carSeatError = carSeatErrorFor(pricing.state, booking.failure);
  const promoError = promoErrorFor(pricing.promo.error, booking.failure);
  const formFailure = isPriceFieldFailure(booking.failure) ? null : booking.failure;
  const resetFormFailure = isPriceFieldFailure(booking.failure)
    ? () => undefined : booking.resetFailure;
  useConfirmFocus(sectionRef, props.autoFocusHeading, carSeatError, promoError);
  return { applyPromo, booking, cardAvailable, carSeatError, carSeatMax, carSeats,
    changeCarSeats, changePayment, changePromo, formFailure, paymentMethod, pricing,
    promoError, removePromo, requestQuote, resetFormFailure, sectionRef };
}

export function Confirm(props: ConfirmProps) {
  const view = useConfirmController(props);
  return <section class="widget" ref={view.sectionRef}>
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps activeStep={3} />
    <div class="confirm-layout">
      <div>
        <TripSummary form={props.form} quote={props.quote}
          serviceName={props.serviceName} vehicle={props.vehicle} />
        {view.requestQuote
          ? <RequestQuotePrice carSeatError={view.carSeatError} carSeatMax={view.carSeatMax}
            carSeats={view.carSeats} currency={props.business.currency}
            onCarSeatsChange={view.changeCarSeats} outOfServiceArea={props.quote.out_of_service_area} />
          : <Charges carSeatError={view.carSeatError} carSeatMax={view.carSeatMax}
            carSeatPrice={props.business.settings.car_seat_price}
            carSeats={view.carSeats} currency={props.business.currency}
            onCarSeatsChange={view.changeCarSeats} onPromoApply={view.applyPromo}
            onPromoInput={view.changePromo} onPromoRemove={view.removePromo}
            promo={view.pricing.promo} promoError={view.promoError} state={view.pricing.state} />}
        <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
      </div>
      <ConfirmForm breakdownReady={view.requestQuote ||
        (view.pricing.state.status === "ready" && !view.pricing.busy)}
        buttonLabel={view.requestQuote ? "Request Quote" : "Create Trip"}
        failure={view.formFailure} isSubmitting={view.booking.isSubmitting}
        onChange={view.resetFormFailure} onValid={view.booking.submit}
        submissionReady={view.paymentMethod === "cash"}
        terms={props.business.settings.terms_and_conditions}
        extraFields={<PaymentMethodField cardAvailable={view.cardAvailable}
          method={view.paymentMethod} onChange={view.changePayment} />} />
    </div>
  </section>;
}
