import type { PaymentMethod } from "../../api/client";

interface PaymentMethodFieldProps {
  cardAvailable: boolean;
  disabled?: boolean;
  method: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export function PaymentMethodField(props: PaymentMethodFieldProps) {
  if (!props.cardAvailable) return null;
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
