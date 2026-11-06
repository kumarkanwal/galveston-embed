import { useEffect, useRef, useState } from "preact/hooks";

import type {
  Business,
  PaymentMethod,
  ShuttleApiClient,
  ShuttleBookingResponse,
  ShuttleQuoteResponse,
} from "../../api/client";
import { ApiError, UnauthorizedError } from "../../api/errors";
import { IdempotencyKeyManager } from "../../api/idempotency";
import { bookingFailure, type BookingFailure } from "../booking/booking-error";
import { ConfirmForm } from "../confirm/ConfirmForm";
import { cardPaymentSettings, paymentAvailability, withPaymentToken } from "../confirm/payment";
import { PaymentMethodField } from "../confirm/PaymentMethodField";
import { PromoCodeField } from "../confirm/PromoCodeField";
import type { PromoCodeState } from "../confirm/use-price-breakdown";
import type { ConfirmFormState } from "../confirm/types";
import { SquareCardField } from "../confirm/SquareCardField";
import { useSquareCard } from "../confirm/use-square-card";
import { ProgressSteps } from "../trip/ProgressSteps";
import { WidgetHeader } from "../shell/WidgetHeader";
import {
  initialShuttleAddresses,
  addressesAfterRouteChange,
  requiredShuttleAddresses,
  shuttleAddressRouteKey,
  updateShuttleAddress,
  type ShuttleAddressField,
} from "./address";
import { isShuttleAvailabilityError, SHUTTLE_UNAVAILABLE_MESSAGE } from "./availability";
import { minimumPassengerError } from "./minimum";
import { buildShuttleBooking, buildShuttleQuote } from "./requests";
import { ShuttleCharges } from "./ShuttleCharges";
import { ShuttleAddressFields } from "./ShuttleAddressFields";
import { ShuttleTripSummary } from "./ShuttleTripSummary";
import type { ShuttleSelection } from "./types";

interface ShuttleConfirmProps {
  business: Business;
  client: ShuttleApiClient;
  mapsKey: string;
  quote: ShuttleQuoteResponse;
  selection: ShuttleSelection;
  onBack: () => void;
  onBooked: (
    response: ShuttleBookingResponse,
    paymentMethod: PaymentMethod,
    customerEmail: string,
  ) => void;
  onUnavailable: (message: string) => void;
}

function initialPromo(): PromoCodeState {
  return { appliedCode: null, error: undefined, input: "", status: "idle" };
}

function useShuttlePromo(props: ShuttleConfirmProps, paymentMethod: PaymentMethod) {
  const [quote, setQuote] = useState(props.quote);
  const [promo, setPromo] = useState<PromoCodeState>(initialPromo);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latestRequest = useRef(0);
  const previousMethod = useRef(paymentMethod);
  const reprice = async (code: string | null, method = paymentMethod) => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setQuoteError(null); setBusy(true);
    try {
      const result = await props.client.quoteShuttle(buildShuttleQuote(props.selection, code, method));
      if (latestRequest.current !== requestId) return false;
      setQuote(result); return true;
    }
    catch (error: unknown) {
      if (latestRequest.current !== requestId) return false;
      const minimum = minimumPassengerError(error);
      if (minimum !== null) setQuoteError(minimum);
      else if (isShuttleAvailabilityError(error)) {
        props.onUnavailable(SHUTTLE_UNAVAILABLE_MESSAGE);
      } else if (error instanceof ApiError && error.code === "PROMO_INVALID") {
        setPromo((current) => ({ ...current, error: error.message, status: "idle" }));
      } else setQuoteError(error instanceof Error ? error.message : "Pricing failed.");
      return false;
    } finally {
      if (latestRequest.current === requestId) setBusy(false);
    }
  };
  useEffect(() => {
    if (previousMethod.current === paymentMethod) return;
    previousMethod.current = paymentMethod;
    void reprice(promo.appliedCode, paymentMethod);
  }, [paymentMethod]);
  const apply = async () => {
    if (promo.input.trim() === "" || promo.status !== "idle") return;
    setPromo((current) => ({ ...current, error: undefined, status: "applying" }));
    if (await reprice(promo.input)) setPromo((current) => ({ ...current,
      appliedCode: current.input, status: "applied" }));
  };
  const remove = async () => {
    setPromo((current) => ({ ...current, status: "removing" }));
    if (await reprice(null)) setPromo(initialPromo());
    else setPromo((current) => ({ ...current, status: "applied" }));
  };
  return { apply, busy, promo, quote, quoteError, remove, setPromo };
}

function useShuttlePayment(business: Business) {
  const payment = paymentAvailability(business);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    payment.defaultMethod ?? "cash",
  );
  const settings = payment.card ? cardPaymentSettings(business) : null;
  const card = useSquareCard(paymentMethod === "online" && payment.card, settings);
  return { card, payment, paymentMethod, setPaymentMethod };
}

function useShuttleConfirm(props: ShuttleConfirmProps) {
  const { card, payment, paymentMethod, setPaymentMethod } = useShuttlePayment(props.business);
  const pricing = useShuttlePromo(props, paymentMethod);
  const [failure, setFailure] = useState<BookingFailure | null>(null),
    [addressError, setAddressError] = useState<ShuttleAddressField | null>(null);
  const [addresses, setAddresses] = useState(initialShuttleAddresses), [submitting, setSubmitting] = useState(false);
  const manager = useRef(new IdempotencyKeyManager()), inFlight = useRef(false),
    route = useRef(shuttleAddressRouteKey(props.selection));
  const submit = async (form: ConfirmFormState) => {
    if (inFlight.current || payment.defaultMethod === null) return;
    const missing = requiredShuttleAddresses(props.selection)
      .find((field) => addresses.values[field] === null);
    if (missing !== undefined) { setAddressError(missing); return; }
    inFlight.current = true; setFailure(null); setSubmitting(true);
    const cart = buildShuttleBooking(
      props.selection, form, addresses.values, pricing.promo.appliedCode, paymentMethod,
    );
    try {
      const key = await manager.current.getKey(cart);
      const body = paymentMethod === "online"
        ? withPaymentToken(cart, await card.tokenize())
        : cart;
      props.onBooked(await props.client.bookShuttle(body, key), paymentMethod, form.email.trim());
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        console.error("Galveston booking widget configuration was rejected.");
      }
      if (isShuttleAvailabilityError(error)) props.onUnavailable(SHUTTLE_UNAVAILABLE_MESSAGE);
      else {
        const minimum = minimumPassengerError(error);
        setFailure(minimum === null ? bookingFailure(error) : { field: null, message: minimum });
      }
    } finally { inFlight.current = false; setSubmitting(false); }
  };
  useEffect(() => {
    const nextRoute = shuttleAddressRouteKey(props.selection);
    if (route.current === nextRoute) return;
    const previousRoute = route.current;
    route.current = nextRoute;
    setAddresses((current) => addressesAfterRouteChange(current, previousRoute, nextRoute));
    setAddressError(null);
    setFailure(null);
  }, [props.selection]);
  const changeAddress = (field: ShuttleAddressField, value: Parameters<typeof updateShuttleAddress>[2]) => {
    setAddresses((current) => updateShuttleAddress(current, field, value));
    setAddressError(null); setFailure(null);
  };
  return { addressError, addresses, card, changeAddress, failure, payment, paymentMethod,
    setFailure, setPaymentMethod, submit, submitting, ...pricing };
}

export function ShuttleConfirm(props: ShuttleConfirmProps) {
  const view = useShuttleConfirm(props);
  return <section class="widget"><WidgetHeader businessName={props.business.name}
    logoUrl={props.business.logo_url} subtitle="Review and confirm your shuttle trip." />
    <ProgressSteps activeStep={3} steps={["Trip", "Departures", "Confirm"]} />
    <div class="confirm-layout shuttle-confirm-layout"><div>
      <ShuttleTripSummary quote={view.quote} selection={props.selection} />
      <ShuttleCharges quote={view.quote} error={view.quoteError} />
      <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
    </div><ConfirmForm breakdownReady={view.quoteError === null && !view.busy}
      buttonLabel="Create Trip"
      failure={view.failure} isSubmitting={view.submitting} onChange={() => view.setFailure(null)}
      submissionReady={view.payment.defaultMethod !== null
        && (view.paymentMethod === "cash" ? view.payment.cash : view.card.ready)}
      onValid={(form) => { void view.submit(form); }} terms={props.business.settings.terms_and_conditions}
      extraFields={<>
        <ShuttleAddressFields errorField={view.addressError} mapsKey={props.mapsKey}
          selection={props.selection} values={view.addresses.values}
          onChange={view.changeAddress} />
        <section class="shuttle-promo"><h2>Promo Code</h2>
          <PromoCodeField promo={view.promo} error={view.promo.error}
            onApply={() => { void view.apply(); }}
            onInput={(value) => view.setPromo((current) => current.status === "idle"
              ? { ...current, error: undefined, input: value } : current)}
            onRemove={() => { void view.remove(); }} />
        </section>
        <PaymentMethodField cardAvailable={view.payment.card} cashAvailable={view.payment.cash}
          method={view.paymentMethod}
          onChange={(method) => { view.setFailure(null); view.setPaymentMethod(method); }} />
        {view.payment.card && view.paymentMethod === "online"
          && <SquareCardField state={view.card.state} />}
      </>} />
    </div>
  </section>;
}
