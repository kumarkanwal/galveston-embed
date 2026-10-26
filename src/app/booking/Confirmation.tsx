import type {
  PaymentMethod,
  ShuttleBookingResponse,
  TaxiBookingResponse,
} from "../../api/client";
import { formatMoney } from "../../money";
import { ProgressSteps } from "../trip/ProgressSteps";
import { useEffect, useRef } from "preact/hooks";

interface ConfirmationProps {
  autoFocusHeading?: boolean;
  currency: string;
  paymentMethod?: PaymentMethod;
  requestQuote: boolean;
  response: TaxiBookingResponse | ShuttleBookingResponse;
  steps?: string[];
}
function isPendingPricedStatus(status: string): boolean {
  return status === "requested" || status === "pending";
}

export function Confirmation(props: ConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (props.autoFocusHeading) headingRef.current?.focus();
  }, [props.autoFocusHeading]);
  return <section class="widget confirmation">
    <ProgressSteps activeStep={3} complete
      {...(props.steps === undefined ? {} : { steps: props.steps })} />
    <h1 ref={headingRef} tabIndex={-1}>
      <span class="confirmation-check" aria-hidden="true">✓</span> Confirmation
    </h1>
    <div class="confirmation-notice" role="status">
      {props.paymentMethod === "online" && !props.requestQuote && <p>
        Payment processing. You&apos;ll get a confirmation email.
      </p>}
      {props.paymentMethod !== "online" && props.requestQuote && <p>
        Thank you! Your quote request was successfully submitted. Your pending reservation number is{" "}
        <strong>{props.response.order_number}</strong>.
      </p>}
      {props.paymentMethod !== "online" && !props.requestQuote
        && isPendingPricedStatus(props.response.status) && <p>
        Thank you! Your booking request was submitted. Your reservation number is{" "}
        <strong>{props.response.order_number}</strong>. The company will confirm your trip.
      </p>}
      {props.paymentMethod !== "online" && !props.requestQuote
        && !isPendingPricedStatus(props.response.status) && <p>
        Thank you! Your reservation was successfully submitted. Your reservation number is{" "}
        <strong>{props.response.order_number}</strong>.
      </p>}
      {!props.requestQuote && <p class="confirmation-total">
        Total: <strong>{formatMoney(props.response.total, props.currency)}</strong>
      </p>}
    </div>
  </section>;
}
