import type {
  PaymentMethod,
  ShuttleBookingResponse,
  TaxiBookingResponse,
} from "../../api/client";
import { formatMoney } from "../../money";
import { ProgressSteps } from "../trip/ProgressSteps";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

interface ConfirmationProps {
  autoFocusHeading?: boolean;
  businessName?: string | undefined;
  currency: string;
  customerEmail: string;
  emailsEnabled?: boolean;
  logoUrl?: string | null | undefined;
  paymentMethod?: PaymentMethod;
  requestQuote: boolean;
  response: TaxiBookingResponse | ShuttleBookingResponse;
  steps?: string[];
}

async function copyReference(reference: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(reference);
    return true;
  } catch {
    return false;
  }
}

export function Confirmation(props: ConfirmationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  useLayoutEffect(() => {
    if (props.autoFocusHeading) headingRef.current?.focus();
  }, [props.autoFocusHeading]);
  async function handleCopy() {
    const copied = await copyReference(props.response.order_number);
    setCopyStatus(copied ? "Copied" : "Copy unavailable. Select the reference to copy it.");
  }
  return <section class="widget confirmation">
    {props.logoUrl != null && props.logoUrl !== "" && <img class="business-logo"
      src={props.logoUrl} alt={props.businessName ?? "Business"} />}
    <ProgressSteps activeStep={3} complete
      {...(props.steps === undefined ? {} : { steps: props.steps })} />
    <h1 ref={headingRef} tabIndex={-1}>
      <span class="confirmation-check" aria-hidden="true">✓</span> Confirmation
    </h1>
    <div class="confirmation-notice" role="status">
      <p>{props.paymentMethod === "online"
        ? "Payment submitted. Your booking is requested. Our team will contact you to confirm."
        : "Your booking is requested. Our team will contact you to confirm."}</p>
      {props.emailsEnabled === true
        && <p>A confirmation email has been sent to {props.customerEmail}.</p>}
      <p class="confirmation-reference">
        <span>Booking reference:</span> <strong>{props.response.order_number}</strong>
        <button type="button" onClick={() => { void handleCopy(); }}>Copy</button>
        <span class="copy-status" aria-live="polite">{copyStatus}</span>
      </p>
      {!props.requestQuote && <p class="confirmation-total">
        Total: <strong>{formatMoney(props.response.total, props.currency)}</strong>
      </p>}
    </div>
  </section>;
}
