import type { PaymentMethod } from "../../api/client";
import { PAYMENT_UNAVAILABLE_MESSAGE, paymentLabel } from "./payment";

interface PaymentMethodFieldProps {
  cardAvailable: boolean;
  cashAvailable: boolean;
  disabled?: boolean;
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodField(props: PaymentMethodFieldProps) {
  if (!props.cashAvailable && !props.cardAvailable) {
    return <p class="payment-unavailable" role="alert">{PAYMENT_UNAVAILABLE_MESSAGE}</p>;
  }
  if (!props.cashAvailable || !props.cardAvailable) {
    const method = props.cardAvailable ? "online" : "cash";
    return <p class="payment-summary">Payment: {paymentLabel(method)}</p>;
  }
  return <fieldset class="payment-method">
    <legend>Payment Method</legend>
    <div class="payment-options">
      <label>
        <input type="radio" name="payment-method" value="cash"
          checked={props.method === "cash"} disabled={props.disabled}
          onInput={() => props.onChange("cash")} />
        <span>Cash</span>
      </label>
      <label>
        <input type="radio" name="payment-method" value="online"
          checked={props.method === "online"} disabled={props.disabled}
          onInput={() => props.onChange("online")} />
        <span>Card</span>
      </label>
    </div>
  </fieldset>;
}
