import type { ComponentChildren } from "preact";
import type { PaymentMethod, ShuttleQuoteResponse } from "../../api/client";
import { formatPercent } from "../../money";
import { PAYMENT_UNAVAILABLE_MESSAGE, paymentLabel } from "../confirm/payment";

interface ShuttlePaymentMethodFieldProps {
  cardAvailable: boolean;
  cashAvailable: boolean;
  disabled?: boolean;
  discount: ShuttleQuoteResponse["cash_discount"];
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

function CashBadge({ discount }: Pick<ShuttlePaymentMethodFieldProps, "discount">) {
  const saving = discount.enabled && discount.percent !== null
    ? ` — save ${formatPercent(discount.percent)}%`
    : "";
  return <span class="payment-card-badge recommended">Recommended{saving}</span>;
}

function MethodCard(props: {
  badge: ComponentChildren;
  checked: boolean;
  disabled: boolean | undefined;
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}) {
  return <label class={`payment-option-card${props.checked ? " selected" : ""}`}>
    <input type="radio" name="payment-method" value={props.method}
      checked={props.checked} disabled={props.disabled}
      onInput={() => props.onChange(props.method)} />
    <strong>{paymentLabel(props.method)}</strong>
    {props.badge}
  </label>;
}

export function ShuttlePaymentMethodField(props: ShuttlePaymentMethodFieldProps) {
  if (!props.cashAvailable && !props.cardAvailable) {
    return <p class="payment-unavailable" role="alert">{PAYMENT_UNAVAILABLE_MESSAGE}</p>;
  }
  if (!props.cashAvailable || !props.cardAvailable) {
    const method = props.cardAvailable ? "online" : "cash";
    return <p class="payment-summary">Payment: {paymentLabel(method)}</p>;
  }
  return <fieldset class="payment-method shuttle-payment-method">
    <legend>Payment Method</legend>
    <div class="payment-options shuttle-payment-options">
      <MethodCard badge={<CashBadge discount={props.discount} />}
        checked={props.method === "cash"} disabled={props.disabled}
        method="cash" onChange={props.onChange} />
      <MethodCard badge={<span class="payment-card-badge standard">Standard price</span>}
        checked={props.method === "online"} disabled={props.disabled}
        method="online" onChange={props.onChange} />
    </div>
  </fieldset>;
}
