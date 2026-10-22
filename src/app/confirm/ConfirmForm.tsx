import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";

import type { BookingFailure } from "../booking/booking-error";
import { FieldError, FormError } from "../trip/FieldError";
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
  extraFields?: ComponentChildren;
}

export function ConfirmForm(props: ConfirmFormProps) {
  const state = useConfirmForm(props.breakdownReady, props.onChange, props.onValid);
  const errors = props.failure?.field === null || props.failure === null
    ? state.errors
    : { ...state.errors, [props.failure.field]: props.failure.message };
  useEffect(() => {
    if (props.failure?.field == null) return;
    state.formRef.current
      ?.querySelector<HTMLElement>(`[data-confirm-field="${props.failure.field}"]`)?.focus();
  }, [props.failure, state.formRef]);
  return <form class="confirm-form" ref={state.formRef} noValidate onSubmit={state.submit}>
    <h2>Special Requests</h2>
    <div class="field">
      <label class="visually-hidden" for="comments">Special Requests</label>
      <input id="comments" data-confirm-field="comments" value={state.form.comments}
        maxLength={2000} aria-invalid={errors.comments !== undefined}
        aria-describedby={errors.comments === undefined ? undefined : "comments-error"}
        placeholder="Enter any specialized instructions or requests here"
        onBlur={() => state.blur("comments")}
        onInput={(event) => state.update("comments", event.currentTarget.value)} />
      <FieldError id="comments-error" message={errors.comments} />
    </div>
    <h2>Personal Info</h2>
    <CustomerFields blur={state.blur} errors={errors} form={state.form} update={state.update} />
    {props.extraFields}
    <TermsAgreement accepted={state.form.acceptedTerms} error={errors.acceptedTerms}
      terms={props.terms} onBlur={() => state.blur("acceptedTerms")}
      onChange={(value) => state.update("acceptedTerms", value)} />
    <FieldError id="breakdown-error" message={errors.breakdown} />
    {props.failure?.field === null && <FormError>{props.failure.message}</FormError>}
    <button class="create-trip" type="submit" disabled={props.isSubmitting}>
      {props.isSubmitting ? "Submitting…" : `${props.buttonLabel} ›`}
    </button>
  </form>;
}
