import type { ShuttleQuoteResponse } from "../../api/client";
import { formatMoney } from "../../money";

export function CashDiscountBanner(props: {
  discount: ShuttleQuoteResponse["cash_discount"];
  currency: string;
}) {
  if (!props.discount.enabled) return null;
  const percent = props.discount.percent === null ? "" : ` ${props.discount.percent}%`;
  return <aside class="cash-discount-banner" aria-label="Cash discount">
    <span class="cash-discount-icon" aria-hidden="true">◎</span>
    <div class="cash-discount-copy">
      <strong>Save{percent} with Cash!</strong>
      {props.discount.note !== null && <p>{props.discount.note}</p>}
    </div>
    <div class="cash-discount-saving">
      <span>You Save</span>
      <strong>{formatMoney(props.discount.savings_amount, props.currency)}</strong>
    </div>
  </aside>;
}
