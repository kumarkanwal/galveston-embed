import type { TaxiBookingResponse } from "../../api/client";
import { formatMoney } from "../../money";
import { ProgressSteps } from "../trip/ProgressSteps";

interface ConfirmationProps {
  currency: string;
  requestQuote: boolean;
  response: TaxiBookingResponse;
}

function confirmationLead(requestQuote: boolean): string {
  return requestQuote
    ? "Thank you! Your quote request was successfully submitted. Your pending reservation number is"
    : "Thank you! Your reservation was successfully submitted. Your reservation number is";
}

export function Confirmation(props: ConfirmationProps) {
  return <section class="widget confirmation" aria-live="polite">
    <ProgressSteps activeStep={3} />
    <h1><span class="confirmation-check" aria-hidden="true">✓</span> Confirmation</h1>
    <div class="confirmation-notice" role="status">
      <p>{confirmationLead(props.requestQuote)} <strong>{props.response.order_number}</strong>.</p>
      {props.response.confirmation_email_sent && <p>
        You will receive an email confirming your details.
      </p>}
      {!props.requestQuote && <p class="confirmation-total">
        Total: <strong>{formatMoney(props.response.total, props.currency)}</strong>
      </p>}
    </div>
  </section>;
}
