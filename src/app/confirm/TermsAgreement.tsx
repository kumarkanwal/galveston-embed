import { useEffect, useRef, useState } from "preact/hooks";

import { FieldError } from "../trip/FieldError";

interface TermsAgreementProps {
  accepted: boolean;
  error: string | undefined;
  onChange: (accepted: boolean) => void;
  terms: string | null | undefined;
}

export function TermsAgreement(props: TermsAgreementProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const hasTerms = props.terms?.trim() !== "" && props.terms != null;
  const close = () => {
    setOpen(false);
    linkRef.current?.focus();
  };
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);
  return <div class="terms-field">
    <div class="terms-label">
      <input id="accepted-terms" type="checkbox" checked={props.accepted}
        data-confirm-field="acceptedTerms"
        aria-invalid={props.error !== undefined}
        onChange={(event) => props.onChange(event.currentTarget.checked)} />
      <span class="terms-copy">
        <label for="accepted-terms">By checking this box you agree to our
          {!hasTerms && " Terms & Conditions"}</label>
        {hasTerms && <button ref={linkRef} class="terms-link" type="button"
          aria-controls="terms-panel" aria-expanded={open}
          onClick={() => setOpen(true)}>Terms &amp; Conditions</button>}
      </span>
    </div>
    <FieldError id="acceptedTerms-error" message={props.error} />
    {open && hasTerms && <div id="terms-panel" class="terms-panel" role="dialog"
      aria-label="Terms & Conditions" onKeyDown={(event) => {
        if (event.key === "Escape") close();
      }}>
      <h3>Terms &amp; Conditions</h3>
      <div class="terms-text">{props.terms}</div>
      <button ref={closeRef} type="button" class="terms-close" onClick={close}>Close</button>
    </div>}
  </div>;
}
