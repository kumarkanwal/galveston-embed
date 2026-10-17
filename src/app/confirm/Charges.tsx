import { formatMoney, formatMoneyAmount } from "../../money";
import { FieldError, FormError } from "../trip/FieldError";
import { PromoCodeField } from "./PromoCodeField";
import type { BreakdownState, PromoCodeState } from "./use-price-breakdown";

interface ChargesProps {
  carSeatError: string | undefined;
  carSeatMax: number;
  carSeatPrice: string;
  carSeats: number;
  currency: string;
  onCarSeatsChange: (count: number) => void;
  onPromoApply: () => void;
  onPromoInput: (value: string) => void;
  onPromoRemove: () => void;
  promo: PromoCodeState;
  promoError: string | undefined;
  state: BreakdownState;
}

export interface CarSeatsFieldProps {
  carSeatError: string | undefined;
  carSeatMax: number;
  carSeatPrice: string | undefined;
  carSeats: number;
  currency: string;
  onCarSeatsChange: (count: number) => void;
}

export function CarSeatsField(props: CarSeatsFieldProps) {
  if (props.carSeatMax <= 0) return null;
  const options = Array.from({ length: props.carSeatMax + 1 }, (_, count) => count);
  return <div class="car-seats">
    <label for="carSeats">Car Seats {props.carSeatPrice !== undefined && <small>
      {formatMoneyAmount(props.carSeatPrice, props.currency)} each
    </small>}</label>
    <select aria-describedby={props.carSeatError === undefined ? undefined : "carSeats-error"}
      aria-invalid={props.carSeatError !== undefined} data-confirm-field="carSeats"
      id="carSeats" value={props.carSeats}
      onChange={(event) => props.onCarSeatsChange(Number(event.currentTarget.value))}>
      {options.map((count) => <option value={count}>{count} Car Seats</option>)}
    </select>
    <FieldError id="carSeats-error" message={props.carSeatError} />
  </div>;
}

export function Charges(props: ChargesProps) {
  const response = props.state.status === "ready" ? props.state.data : null;
  const lines = response?.line_items?.filter((line) => line.amount !== "0.00") ?? [];
  return <section class="charges">
    <h2>Charges</h2>
    {props.state.status === "loading" && <p class="charges-status" role="status">
      Loading charges…
    </p>}
    {props.state.status === "error" && props.state.field === null &&
      <FormError>{props.state.message}</FormError>}
    {lines.map((line, index) => <div class="charge-row" key={index}>
      <span>{line.label}</span><span>{formatMoney(line.amount, response?.currency ?? props.currency)}</span>
    </div>)}
    <CarSeatsField carSeatError={props.carSeatError} carSeatMax={props.carSeatMax}
      carSeatPrice={props.carSeatPrice} carSeats={props.carSeats} currency={props.currency}
      onCarSeatsChange={props.onCarSeatsChange} />
    <PromoCodeField error={props.promoError} onApply={props.onPromoApply}
      onInput={props.onPromoInput} onRemove={props.onPromoRemove} promo={props.promo} />
    {response !== null && <div class="charges-total">
      <strong>Total</strong><strong>{formatMoney(response.total, response.currency)}</strong>
    </div>}
  </section>;
}
