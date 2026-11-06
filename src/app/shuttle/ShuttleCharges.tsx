import type { ShuttleQuoteResponse } from "../../api/client";
import { formatMoney } from "../../money";
import { FormError } from "../trip/FieldError";

export function ShuttleCharges(props: {
  error: string | null;
  quote: ShuttleQuoteResponse;
}) {
  const lines = props.quote.line_items?.filter((line) => line.amount !== "0.00") ?? [];
  return <section class="charges shuttle-charges">
    <h2>Charges</h2>
    {lines.map((line, index) => <div class="charge-row" key={`${line.label}:${index}`}>
      <span>{line.label}</span>
      <span>{formatMoney(line.amount, props.quote.currency)}</span>
    </div>)}
    {props.error !== null && <FormError>{props.error}</FormError>}
    <div class="charges-total"><strong>Total</strong>
      <strong>{formatMoney(props.quote.total, props.quote.currency)}</strong></div>
  </section>;
}
