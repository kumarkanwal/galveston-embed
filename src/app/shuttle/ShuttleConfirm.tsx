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
import { formatMoney } from "../../money";
import { bookingFailure, type BookingFailure } from "../booking/booking-error";
import { ConfirmForm } from "../confirm/ConfirmForm";
import { cardPaymentSettings } from "../confirm/payment";
import { PaymentMethodField } from "../confirm/PaymentMethodField";
import { PromoCodeField } from "../confirm/PromoCodeField";
import type { PromoCodeState } from "../confirm/use-price-breakdown";
import type { ConfirmFormState } from "../confirm/types";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import { buildShuttleBooking, buildShuttleQuote } from "./requests";
import type { SelectedShuttleLeg, ShuttleSelection } from "./types";

interface ShuttleConfirmProps {
  business: Business;
  client: ShuttleApiClient;
  quote: ShuttleQuoteResponse;
  selection: ShuttleSelection;
  onBack: () => void;
  onBooked: (response: ShuttleBookingResponse) => void;
  onUnavailable: (message: string) => void;
}

function initialPromo(): PromoCodeState {
  return { appliedCode: null, error: undefined, input: "", status: "idle" };
}

function legLabel(leg: SelectedShuttleLeg): string {
  if (leg.kind === "scheduled") {
    const end = leg.departure.end_time == null ? "" : ` – ${leg.departure.end_time}`;
    return `${leg.date} at ${leg.departure.start_time}${end}`;
  }
  return `${leg.date} at ${leg.time} — ${leg.vehicleTypeName}`;
}

function ShuttleSummary({ selection }: { selection: ShuttleSelection }) {
  return <section class="trip-summary"><h2 tabIndex={-1}>Trip Summary</h2>
    <div class="shuttle-summary">
      <h3>{selection.from.name} → {selection.to.name}</h3>
      <p>Outbound: {legLabel(selection.outbound)}</p>
      {selection.returnLeg !== null && <p>Return: {legLabel(selection.returnLeg)}</p>}
      <p>{selection.trip.paxAdult} adults
        {selection.trip.paxSenior > 0 ? `, ${selection.trip.paxSenior} seniors` : ""}
        {selection.trip.paxChild > 0 ? `, ${selection.trip.paxChild} children` : ""}</p>
    </div>
  </section>;
}

function ShuttleCharges(props: {
  currency: string;
  error: string | null;
  promo: PromoCodeState;
  quote: ShuttleQuoteResponse;
  onApply: () => void;
  onInput: (value: string) => void;
  onRemove: () => void;
}) {
  const lines = props.quote.line_items?.filter((line) => line.amount !== "0.00") ?? [];
  return <section class="charges"><h2>Charges</h2>
    {lines.map((line, index) => <div class="charge-row" key={index}>
      <span>{line.label}</span><span>{formatMoney(line.amount, props.quote.currency)}</span>
    </div>)}
    <PromoCodeField promo={props.promo} error={props.promo.error}
      onApply={props.onApply} onInput={props.onInput} onRemove={props.onRemove} />
    {props.error !== null && <FormError>{props.error}</FormError>}
    <div class="charges-total"><strong>Total</strong>
      <strong>{formatMoney(props.quote.total, props.currency)}</strong></div>
  </section>;
}

function AddressField(props: {
  error: string | undefined;
  required: boolean;
  value: string;
  onInput: (value: string) => void;
}) {
  if (!props.required) return null;
  return <div class="field"><label for="shuttle-address">Street Address</label>
    <input id="shuttle-address" data-confirm-field="address" maxLength={500}
      value={props.value} aria-invalid={props.error !== undefined}
      onInput={(event) => props.onInput(event.currentTarget.value)} />
    <FieldError id="address-error" message={props.error} />
  </div>;
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
      if (error instanceof ApiError && error.code === "PROMO_INVALID") {
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

function useShuttleConfirm(props: ShuttleConfirmProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const pricing = useShuttlePromo(props, paymentMethod);
  const [failure, setFailure] = useState<BookingFailure | null>(null);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const manager = useRef(new IdempotencyKeyManager());
  const inFlight = useRef(false);
  const submit = async (form: ConfirmFormState) => {
    if (inFlight.current) return;
    const addressRequired = props.selection.from.requires_address || props.selection.to.requires_address;
    if (addressRequired && address.trim() === "") {
      setFailure({ field: "address", message: "Enter the street address for this trip." }); return;
    }
    inFlight.current = true; setFailure(null); setSubmitting(true);
    const body = buildShuttleBooking(
      props.selection, form, address, pricing.promo.appliedCode, paymentMethod,
    );
    try {
      const key = await manager.current.getKey(body);
      props.onBooked(await props.client.bookShuttle(body, key));
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) {
        console.error("Galveston booking widget configuration was rejected.");
      }
      if (error instanceof ApiError && (error.code === "SEATS_UNAVAILABLE"
        || error.code === "SCHEDULE_INACTIVE")) props.onUnavailable(error.message);
      else setFailure(bookingFailure(error));
    } finally { inFlight.current = false; setSubmitting(false); }
  };
  return { address, failure, paymentMethod, setAddress, setFailure, setPaymentMethod,
    submit, submitting, ...pricing };
}

export function ShuttleConfirm(props: ShuttleConfirmProps) {
  const view = useShuttleConfirm(props);
  const addressRequired = props.selection.from.requires_address || props.selection.to.requires_address;
  const addressError = view.failure?.field === "address" ? view.failure.message : undefined;
  const formFailure = view.failure?.field === "address" ? null : view.failure;
  const cardAvailable = cardPaymentSettings(props.business) !== null;
  return <section class="widget"><header class="widget-heading">
    <h1>Reservations</h1><p>Review and confirm your shuttle trip.</p></header>
    <ProgressSteps activeStep={3} steps={["Trip", "Departures", "Confirm"]} />
    <div class="confirm-layout"><div>
      <ShuttleSummary selection={props.selection} />
      <ShuttleCharges currency={props.business.currency} quote={view.quote}
        promo={view.promo} error={view.quoteError} onApply={() => { void view.apply(); }}
        onInput={(value) => view.setPromo((current) => current.status === "idle"
          ? { ...current, error: undefined, input: value } : current)}
        onRemove={() => { void view.remove(); }} />
      <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
    </div><ConfirmForm breakdownReady={view.quoteError === null && !view.busy}
      buttonLabel="Create Trip"
      failure={formFailure} isSubmitting={view.submitting} onChange={() => view.setFailure(null)}
      submissionReady={view.paymentMethod === "cash"}
      onValid={(form) => { void view.submit(form); }} terms={props.business.settings.terms_and_conditions}
      extraFields={<>
        <AddressField required={addressRequired} value={view.address}
          error={addressError} onInput={(value) => { view.setAddress(value); view.setFailure(null); }} />
        <PaymentMethodField cardAvailable={cardAvailable} method={view.paymentMethod}
          onChange={(method) => { view.setFailure(null); view.setPaymentMethod(method); }} />
      </>} />
    </div>
  </section>;
}
