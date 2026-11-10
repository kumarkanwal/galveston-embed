import type {
  ShuttleAdjustmentLine,
  ShuttleIncludedChargeLine,
  ShuttlePassengerPriceLine,
} from "../../api/client";
import { formatMoney } from "../../money";

interface PriceLeg {
  charges: ShuttleIncludedChargeLine[];
  passenger_lines: ShuttlePassengerPriceLine[];
}

interface ShuttlePriceLinesProps {
  adjustments?: ShuttleAdjustmentLine[] | undefined;
  currency: string;
  legs: PriceLeg[];
}

function passengerTypeLabel(type: ShuttlePassengerPriceLine["passenger_type"]): string {
  if (type === "adult") return "Adult";
  if (type === "senior") return "Senior";
  return "Child";
}

function PassengerLine(props: {
  currency: string;
  line: ShuttlePassengerPriceLine;
}) {
  if (props.line.line_total === "0.00") return null;
  return <div class="charge-row shuttle-passenger-line">
    <span>{passengerTypeLabel(props.line.passenger_type)} × {props.line.count}{" "}
      ({formatMoney(props.line.unit_price, props.currency)})</span>
    <span>{formatMoney(props.line.line_total, props.currency)}</span>
  </div>;
}

function IncludedCharge(props: {
  charge: ShuttleIncludedChargeLine;
  currency: string;
}) {
  if (props.charge.amount === "0.00") return null;
  return <div class="charge-row shuttle-included-charge">
    <span>{props.charge.label}{" "}
      <small>(included)</small></span>
    <span>{formatMoney(props.charge.amount, props.currency)}</span>
  </div>;
}

export function ShuttlePriceLines(props: ShuttlePriceLinesProps) {
  return <div class="shuttle-price-lines">
    {props.legs.map((leg, index) => <div class="shuttle-leg-price-lines" key={index}>
      <h3>{index === 0 ? "Outbound" : "Return"}</h3>
      {leg.passenger_lines.map((line) => <PassengerLine currency={props.currency}
        key={line.passenger_type} line={line} />)}
      {leg.charges.map((charge, chargeIndex) => <IncludedCharge
        key={`${charge.label}:${chargeIndex}`} charge={charge}
        currency={props.currency} />)}
    </div>)}
    {props.adjustments?.filter((line) => line.amount !== "0.00").map((line, index) =>
      <div class="charge-row shuttle-adjustment" key={`${line.label}:${index}`}>
        <span>{line.label}</span><span>{formatMoney(line.amount, props.currency)}</span>
      </div>)}
  </div>;
}
