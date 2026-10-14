import type { BookingFailure } from "../booking/booking-error";
import { FieldError } from "../trip/FieldError";
import { CustomerFields } from "./CustomerFields";
import { TermsAgreement } from "./TermsAgreement";
import { useConfirmForm } from "./use-confirm-form";

interface ConfirmFormProps {
  breakdownReady: boolean;
  buttonLabel: string;
  failure: BookingFailure | null;
  isSubmitting: boolean;
  onChange: () => void;
  onValid: Parameters<typeof useConfirmForm>[2];
  terms: string | null | undefined;
}

export function ConfirmForm(props: ConfirmFormProps) {
  const state = useConfirmForm(props.breakdownReady, props.onChange, props.onValid);
  const errors = props.failure?.field === null || props.failure === null
    ? state.errors
    : { ...state.errors, [props.failure.field]: props.failure.message };
  return <form class="confirm-form" ref={state.formRef} noValidate onSubmit={state.submit}>
    <h2>Special Requests</h2>
    <div class="field">
      <label class="visually-hidden" for="comments">Special Requests</label>
      <input id="comments" data-confirm-field="comments" value={state.form.comments}
        maxLength={2000} aria-invalid={errors.comments !== undefined}
        placeholder="Enter any specialized instructions or requests here"
        onInput={(event) => state.update("comments", event.currentTarget.value)} />
      <FieldError id="comments-error" message={errors.comments} />
    </div>
    <h2>Personal Info</h2>
    <CustomerFields errors={errors} form={state.form} update={state.update} />
    <TermsAgreement accepted={state.form.acceptedTerms} error={errors.acceptedTerms}
      terms={props.terms} onChange={(value) => state.update("acceptedTerms", value)} />
    <FieldError id="breakdown-error" message={errors.breakdown} />
    {props.failure?.field === null && <p class="form-error" role="alert">
      {props.failure.message}
    </p>}
    <button class="create-trip" type="submit" disabled={props.isSubmitting}>
      {props.isSubmitting ? "Submitting…" : `${props.buttonLabel} ›`}
    </button>
  </form>;
}
