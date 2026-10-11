import { useState } from "preact/hooks";

import { FieldError } from "../trip/FieldError";

interface TermsAgreementProps {
  accepted: boolean;
  error: string | undefined;
  onChange: (accepted: boolean) => void;
  terms: string | null | undefined;
}

export function TermsAgreement(props: TermsAgreementProps) {
  const [open, setOpen] = useState(false);
  const hasTerms = props.terms?.trim() !== "" && props.terms != null;
  return <div class="terms-field">
    <label class="terms-label">
      <input type="checkbox" checked={props.accepted} data-confirm-field="acceptedTerms"
        aria-invalid={props.error !== undefined}
        onChange={(event) => props.onChange(event.currentTarget.checked)} />
      <span>By checking this box you agree to our {hasTerms
        ? <button class="terms-link" type="button" onClick={() => setOpen(true)}>
          Terms &amp; Conditions
        </button>
        : "Terms & Conditions"}</span>
    </label>
    <FieldError id="acceptedTerms-error" message={props.error} />
    {open && hasTerms && <div class="terms-panel" role="dialog" aria-label="Terms & Conditions">
      <h3>Terms &amp; Conditions</h3>
      <div class="terms-text">{props.terms}</div>
      <button type="button" class="terms-close" onClick={() => setOpen(false)}>Close</button>
    </div>}
  </div>;
}
