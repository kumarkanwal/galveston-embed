import type { TaxiBookingRequest } from "../../api/client";
import { FieldError } from "../trip/FieldError";
import { CustomerFields } from "./CustomerFields";
import { TermsAgreement } from "./TermsAgreement";
import { useConfirmForm } from "./use-confirm-form";

interface ConfirmFormProps {
  booking: TaxiBookingRequest | null;
  breakdownReady: boolean;
  onChange: () => void;
  onValid: Parameters<typeof useConfirmForm>[2];
  terms: string | null | undefined;
}

export function ConfirmForm(props: ConfirmFormProps) {
  const state = useConfirmForm(props.breakdownReady, props.onChange, props.onValid);
  return <form class="confirm-form" ref={state.formRef} noValidate onSubmit={state.submit}>
    <h2>Special Requests</h2>
    <div class="field">
      <label class="visually-hidden" for="comments">Special Requests</label>
      <input id="comments" value={state.form.comments} maxLength={2000}
        placeholder="Enter any specialized instructions or requests here"
        onInput={(event) => state.update("comments", event.currentTarget.value)} />
    </div>
    <h2>Personal Info</h2>
    <CustomerFields errors={state.errors} form={state.form} update={state.update} />
    <TermsAgreement accepted={state.form.acceptedTerms} error={state.errors.acceptedTerms}
      terms={props.terms} onChange={(value) => state.update("acceptedTerms", value)} />
    <FieldError id="breakdown-error" message={state.errors.breakdown} />
    {props.booking !== null && <p class="booking-next" role="status">Booking — coming next</p>}
    <button class="create-trip" type="submit">Create Trip ›</button>
  </form>;
}
