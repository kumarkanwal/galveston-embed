import { useState } from "preact/hooks";

import type { ShuttleDeparture } from "../../api/client";
import { formatMoney } from "../../money";
import { FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import type { DepartureViewData, OnRequestLeg, ScheduledLeg } from "./types";

interface ShuttleDeparturesProps {
  currency: string;
  loadingReturn: boolean;
  notice: string | null;
  outboundData: DepartureViewData;
  returnData: DepartureViewData | null;
  onBack: () => void;
  onChooseOutbound: (leg: ScheduledLeg | OnRequestLeg) => void;
  onChooseReturn: (leg: ScheduledLeg | OnRequestLeg) => void;
}

interface DepartureSectionProps {
  currency: string;
  data: DepartureViewData;
  onChoose: (leg: ScheduledLeg | OnRequestLeg) => void;
}

function departureTime(departure: ShuttleDeparture): string {
  return departure.end_time == null
    ? departure.start_time
    : `${departure.start_time} – ${departure.end_time}`;
}

function DepartureCard(props: {
  currency: string;
  date: string;
  departure: ShuttleDeparture;
  onChoose: DepartureSectionProps["onChoose"];
}) {
  const departure = props.departure;
  return <article class={`shuttle-departure${departure.selectable ? "" : " unavailable"}`}>
    <div><strong>{departureTime(departure)}</strong><span>{departure.service_label}</span>
      {departure.vehicle_type !== null && <span>Vehicle: {departure.vehicle_type.name}</span>}
    </div>
    <div><span>{departure.seats_remaining} seats left</span>
      {departure.low_seat_warning !== null && <small>{departure.low_seat_warning}</small>}</div>
    <strong>{formatMoney(departure.total_for_selection, props.currency)}</strong>
    <button type="button" disabled={!departure.selectable}
      onClick={() => props.onChoose({ kind: "scheduled", date: props.date, departure })}>
      {departure.selectable ? "Choose" : "Unavailable"}
    </button>
    {!departure.selectable && departure.unselectable_reason !== null &&
      <p class="departure-reason">{departure.unselectable_reason}</p>}
  </article>;
}

function OnRequestChoice(props: DepartureSectionProps) {
  const option = props.data.result.on_request;
  const [time, setTime] = useState("");
  if (option == null) return null;
  const earliestDate = option.earliest_pickup_date;
  const beforeEarliestDate = earliestDate !== null && earliestDate !== undefined
    && props.data.date < earliestDate;
  const minTime = earliestDate === props.data.date
    ? option.earliest_pickup_time?.slice(0, 5)
    : undefined;
  const beforeEarliestTime = minTime !== undefined && time !== "" && time < minTime;
  const choose = () => props.onChoose({
    kind: "on_request",
    date: props.data.date,
    routeId: option.route_id,
    time,
    vehicleTypeId: option.vehicle_type_id,
    vehicleTypeName: option.vehicle_type_name,
  });
  return <section class="on-request-choice">
    <h3>Choose your pickup time</h3>
    <p>Vehicle: <strong>{option.vehicle_type_name}</strong></p>
    <p>{option.seat_capacity} seats available</p>
    <div class="field"><label for={`${props.data.direction}-time`}>Pickup Time</label>
      <input id={`${props.data.direction}-time`} type="time" min={minTime} value={time}
        onInput={(event) => setTime(event.currentTarget.value)} />
    </div>
    <button class="check-pricing" type="button"
      disabled={time === "" || beforeEarliestDate || beforeEarliestTime}
      onClick={choose}>Choose Time</button>
    {beforeEarliestDate && <FormError>This date is earlier than the first available date.</FormError>}
    {beforeEarliestTime && <FormError>Choose a time at or after {minTime}.</FormError>}
  </section>;
}

function emptyMessage(data: DepartureViewData): string {
  const summary = data.result.filtered_summary;
  if (summary?.max_seats_available === 0 && summary.total_scheduled > 0) {
    return "No departures have enough seats for this trip. Please choose another date.";
  }
  if (summary !== null && summary !== undefined && summary.max_seats_available > 0) {
    return "No departure has enough seats for your party. Try fewer passengers or another date.";
  }
  return "No departures are available for this day. Please choose another date.";
}

function DepartureSection(props: DepartureSectionProps) {
  const departures = props.data.direction === "outbound"
    ? props.data.result.departures.filter((departure) => departure.selectable)
    : props.data.result.departures;
  const title = props.data.direction === "outbound" ? "Choose Departure" : "Choose Return";
  return <section class={`departure-section ${props.data.direction}`}>
    <h2 class="step-title">{title}</h2>
    {departures.length === 0 && props.data.result.on_request == null &&
      <div class="empty-vehicles">{emptyMessage(props.data)}</div>}
    {departures.length > 0 && <div class="shuttle-departures">
      {departures.map((departure) => <DepartureCard key={departure.schedule_id}
        currency={props.currency} date={props.data.date} departure={departure}
        onChoose={props.onChoose} />)}
    </div>}
    <OnRequestChoice {...props} />
  </section>;
}

export function ShuttleDepartures(props: ShuttleDeparturesProps) {
  return <section class="widget">
    <header class="widget-heading"><h1>Reservations</h1><p>Choose your shuttle departure.</p></header>
    <ProgressSteps activeStep={2} steps={["Trip", "Departures", "Confirm"]} />
    {props.notice !== null && <div class="service-area-note" role="alert">{props.notice}</div>}
    <DepartureSection currency={props.currency} data={props.outboundData}
      onChoose={props.onChooseOutbound} />
    {props.loadingReturn && <p class="return-loading" role="status">Finding return departures…</p>}
    {props.returnData !== null && <DepartureSection currency={props.currency}
      data={props.returnData} onChoose={props.onChooseReturn} />}
    <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
  </section>;
}
