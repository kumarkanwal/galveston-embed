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
  index: number;
  lines: ShuttlePassengerPriceLine[];
}) {
  const lines = props.lines.filter((line) => line.line_total !== "0.00");
  if (lines.length === 0) return null;
  return <div class="shuttle-passenger-line">
    <strong>{props.index === 0 ? "Outbound" : "Return"}:</strong>{" "}
    {lines.map((line, index) => <span key={line.passenger_type}>
      {index > 0 && " · "}{passengerTypeLabel(line.passenger_type)} × {line.count}{" "}
      {formatMoney(line.line_total, props.currency)}
    </span>)}
  </div>;
}

function IncludedCharge(props: {
  charge: ShuttleIncludedChargeLine;
  currency: string;
  index: number;
}) {
  if (props.charge.amount === "0.00") return null;
  return <div class="charge-row shuttle-included-charge">
    <span>{props.index === 0 ? "Outbound" : "Return"} · {props.charge.label}{" "}
      <small>(included)</small></span>
    <span>{formatMoney(props.charge.amount, props.currency)}</span>
  </div>;
}

export function ShuttlePriceLines(props: ShuttlePriceLinesProps) {
  return <div class="shuttle-price-lines">
    {props.legs.map((leg, index) => <div class="shuttle-leg-price-lines" key={index}>
      <PassengerLine currency={props.currency} index={index} lines={leg.passenger_lines} />
      {leg.charges.map((charge, chargeIndex) => <IncludedCharge
        key={`${charge.label}:${chargeIndex}`} charge={charge}
        currency={props.currency} index={index} />)}
    </div>)}
    {props.adjustments?.filter((line) => line.amount !== "0.00").map((line, index) =>
      <div class="charge-row shuttle-adjustment" key={`${line.label}:${index}`}>
        <span>{line.label}</span><span>{formatMoney(line.amount, props.currency)}</span>
      </div>)}
  </div>;
}
