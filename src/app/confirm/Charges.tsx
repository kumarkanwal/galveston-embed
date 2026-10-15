import { formatMoney } from "../../money";
import { FormError } from "../trip/FieldError";
import type { BreakdownState } from "./use-price-breakdown";

interface ChargesProps {
  carSeats: number;
  currency: string;
  onCarSeatsChange: (count: number) => void;
  state: BreakdownState;
}

const CAR_SEAT_OPTIONS = [0, 1, 2, 3, 4, 5];

export function CarSeatsField(props: Pick<ChargesProps, "carSeats" | "onCarSeatsChange">) {
  return <label class="car-seats">
    <span>Car Seats</span>
    <select value={props.carSeats}
      onChange={(event) => props.onCarSeatsChange(Number(event.currentTarget.value))}>
      {CAR_SEAT_OPTIONS.map((count) => <option value={count}>{count} Car Seats</option>)}
    </select>
  </label>;
}

export function Charges(props: ChargesProps) {
  const response = props.state.status === "ready" ? props.state.data : null;
  const lines = response?.line_items?.filter((line) => line.amount !== "0.00") ?? [];
  return <section class="charges">
    <h2>Charges</h2>
    {props.state.status === "loading" && <p class="charges-status" role="status">
      Loading charges…
    </p>}
    {props.state.status === "error" && <FormError>{props.state.message}</FormError>}
    {lines.map((line, index) => <div class="charge-row" key={index}>
      <span>{line.label}</span><span>{formatMoney(line.amount, response?.currency ?? props.currency)}</span>
    </div>)}
    <CarSeatsField carSeats={props.carSeats} onCarSeatsChange={props.onCarSeatsChange} />
    {response !== null && <div class="charges-total">
      <strong>Total</strong><strong>{formatMoney(response.total, response.currency)}</strong>
    </div>}
  </section>;
}
