import { FieldError } from "../trip/FieldError";
import type { PromoCodeState } from "./use-price-breakdown";

interface PromoCodeFieldProps {
  error: string | undefined;
  onApply: () => void;
  onInput: (value: string) => void;
  onRemove: () => void;
  promo: PromoCodeState;
}

export function PromoCodeField(props: PromoCodeFieldProps) {
  const applied = props.promo.status === "applied" || props.promo.status === "removing";
  const busy = props.promo.status === "applying" || props.promo.status === "removing";
  const buttonLabel = props.promo.status === "applying"
    ? "Applying…"
    : props.promo.status === "removing" ? "Removing…" : applied ? "Remove" : "Apply";
  const describedBy = props.error === undefined
    ? applied ? "promoCode-status" : undefined
    : "promoCode-error";
  return <div class="promo-code">
    <button type="button" disabled={busy || (!applied && props.promo.input.trim() === "")}
      onClick={applied ? props.onRemove : props.onApply}>{buttonLabel}</button>
    <label class="visually-hidden" for="promoCode">Promo code</label>
    <input id="promoCode" data-confirm-field="promoCode" maxLength={64}
      aria-describedby={describedBy} aria-invalid={props.error !== undefined}
      placeholder="Promo Code" readOnly={applied || busy} value={props.promo.input}
      onInput={(event) => props.onInput(event.currentTarget.value)} />
    <FieldError id="promoCode-error" message={props.error} />
    {applied && props.error === undefined && <p id="promoCode-status" role="status">
      Code applied
    </p>}
  </div>;
}
