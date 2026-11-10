import type { ShuttleQuoteResponse } from "../../api/client";
import { formatBusinessLocalDate, formatBusinessLocalDateTime } from "../../time";
import { ConfirmIcon } from "../confirm/ConfirmIcon";
import type { SelectedShuttleLeg, ShuttleSelection } from "./types";

interface SummaryLegProps {
  direction: "Outbound" | "Return";
  leg: SelectedShuttleLeg;
  mode: "shared" | "private";
}

function vehicleName(leg: SelectedShuttleLeg): string {
  if (leg.kind === "private") return leg.car.vehicle_type_name;
  return leg.departure.vehicle_type_name
    ?? leg.departure.vehicle_type?.name
    ?? "Shuttle vehicle";
}

function departureText(leg: SelectedShuttleLeg): string {
  if (leg.kind === "private") {
    return `${formatBusinessLocalDate(leg.date)} · Time: to be arranged`;
  }
  return formatBusinessLocalDateTime(leg.date, leg.departure.start_time.slice(0, 5));
}

function modeLabel(mode: SummaryLegProps["mode"]): string {
  return mode === "private" ? "Private" : "Shared";
}

function SummaryLeg(props: SummaryLegProps) {
  return <div class="shuttle-summary-leg">
    <p class="shuttle-summary-row"><ConfirmIcon name="calendar" />
      <span><strong>{props.direction}:</strong> {departureText(props.leg)}</span></p>
    <p class="shuttle-summary-row"><ConfirmIcon name="vehicle" />
      <span><strong>{props.direction} vehicle:</strong> {vehicleName(props.leg)}<br />
        <strong>Type:</strong> {modeLabel(props.mode)}</span></p>
  </div>;
}

function passengerText(selection: ShuttleSelection): string {
  const trip = selection.trip;
  const parts = [
    [trip.paxAdult, "adult"],
    [trip.paxSenior, "senior"],
    [trip.paxChild, "child"],
  ] as const;
  return parts.filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}${count === 1 ? "" : label === "child" ? "ren" : "s"}`)
    .join(", ");
}

export function ShuttleTripSummary(props: {
  quote: ShuttleQuoteResponse;
  selection: ShuttleSelection;
}) {
  const legs = [props.selection.outbound,
    ...(props.selection.returnLeg === null ? [] : [props.selection.returnLeg])];
  return <section class="trip-summary shuttle-trip-summary">
    <h2 tabIndex={-1}>Trip Summary</h2>
    <div class="shuttle-summary">
      <div class="shuttle-summary-row shuttle-summary-route"><ConfirmIcon name="route" />
        <h3>{props.selection.from.name} <span aria-hidden="true">→</span>{" "}
          {props.selection.to.name}</h3></div>
      {legs.map((leg, index) => <SummaryLeg key={`${leg.kind}:${leg.date}:${index}`}
        direction={index === 0 ? "Outbound" : "Return"} leg={leg}
        mode={props.quote.legs[index]?.service_mode ?? (leg.kind === "private" ? "private" : "shared")} />)}
      <p class="shuttle-summary-row"><ConfirmIcon name="person" />
        <span><strong>Passengers:</strong> {passengerText(props.selection)}</span></p>
      <p class="shuttle-summary-row"><ConfirmIcon name="luggage" />
        <span><strong>Bags:</strong> {props.quote.large_bags} check-in
          {" · "}<strong>Carry-on:</strong> {props.quote.small_bags}</span></p>
    </div>
  </section>;
}
