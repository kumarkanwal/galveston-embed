import type { PaymentMethod, ShuttleQuoteResponse } from "../../api/client";
import { formatMoney } from "../../money";
import { FormError } from "../trip/FieldError";
import { CashDiscountBanner } from "./CashDiscountBanner";
import { ShuttlePriceLines } from "./ShuttlePriceLines";

export function ShuttleCharges(props: {
  error: string | null;
  paymentMethod: PaymentMethod;
  quote: ShuttleQuoteResponse;
}) {
  const methodTotal = props.quote.totals_by_payment_method[props.paymentMethod];
  return <section class="charges shuttle-charges">
    <h2>Charges</h2>
    {methodTotal !== undefined && <ShuttlePriceLines adjustments={methodTotal.adjustments}
      currency={props.quote.currency} legs={props.quote.legs} />}
    {props.error !== null && <FormError>{props.error}</FormError>}
    {methodTotal !== undefined && <div class="charges-total"><strong>Total</strong>
      <strong>{formatMoney(methodTotal.total, props.quote.currency)}</strong></div>}
    <CashDiscountBanner discount={props.quote.cash_discount} currency={props.quote.currency} />
  </section>;
}
