import { useEffect, useRef, useState } from "preact/hooks";

import { FieldError } from "../trip/FieldError";

interface TermsAgreementProps {
  accepted: boolean;
  error: string | undefined;
  onBlur: () => void;
  onChange: (accepted: boolean) => void;
  terms: string | null | undefined;
}

function trapDialogFocus(
  event: KeyboardEvent,
  panel: HTMLDivElement | null,
  close: () => void,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab" || panel === null) return;
  const focusable = [...panel.querySelectorAll<HTMLElement>(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
  )];
  const first = focusable[0], last = focusable.at(-1);
  if (first === undefined || last === undefined) return;
  const current = event.target;
  if ((event.shiftKey && current === first) || (!event.shiftKey && current === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}

export function TermsAgreement(props: TermsAgreementProps) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const linkRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
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
      <label class="checkbox-target">
        <input id="accepted-terms" type="checkbox" checked={props.accepted}
          data-confirm-field="acceptedTerms"
          aria-invalid={props.error !== undefined}
          aria-describedby={props.error === undefined ? undefined : "acceptedTerms-error"}
          onBlur={props.onBlur}
          onChange={(event) => props.onChange(event.currentTarget.checked)} />
        <span class="visually-hidden">Accept Terms &amp; Conditions</span>
      </label>
      <span class="terms-copy">
        <label for="accepted-terms">By checking this box you agree to our
          {!hasTerms && " Terms & Conditions"}</label>
        {hasTerms && <button ref={linkRef} class="terms-link" type="button"
          aria-controls="terms-panel" aria-expanded={open}
          onClick={() => setOpen(true)}>Terms &amp; Conditions</button>}
      </span>
    </div>
    <FieldError id="acceptedTerms-error" message={props.error} />
    {open && hasTerms && <div class="terms-overlay">
      <div id="terms-panel" class="terms-panel" role="dialog" aria-modal="true"
        aria-labelledby="terms-heading" ref={panelRef}
        onKeyDown={(event) => trapDialogFocus(event, panelRef.current, close)}>
        <h3 id="terms-heading">Terms &amp; Conditions</h3>
        <div class="terms-text" tabIndex={0}>{props.terms}</div>
        <button ref={closeRef} type="button" class="terms-close" onClick={close}>Close</button>
      </div>
    </div>}
  </div>;
}
