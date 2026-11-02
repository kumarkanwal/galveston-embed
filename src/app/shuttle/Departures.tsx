import { useState } from "preact/hooks";

import type { OnRequestAvailability, ShuttleDeparture, ShuttleRoute } from "../../api/client";
import { formatMoney } from "../../money";
import { formatBusinessLocalDate } from "../../time";
import { openNativePicker } from "../shell/native-picker";
import { WidgetHeader } from "../shell/WidgetHeader";
import { FieldError, FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import { minimumMessage } from "./minimum";
import type {
  DepartureViewData,
  OnRequestLeg,
  ScheduledLeg,
  SelectedShuttleLeg,
} from "./types";

interface ShuttleDeparturesProps {
  businessName?: string | undefined;
  currency: string;
  loadingOutbound: boolean;
  loadingReturn: boolean;
  logoUrl?: string | null | undefined;
  notice: string | null;
  outboundData: DepartureViewData | null;
  passengerCount: number;
  returnData: DepartureViewData | null;
  selectedOutbound: SelectedShuttleLeg | null;
  selectedReturn: SelectedShuttleLeg | null;
  onBack: () => void;
  onChooseOutbound: (leg: ScheduledLeg | OnRequestLeg) => void;
  onChooseReturn: (leg: ScheduledLeg | OnRequestLeg) => void;
}

interface DepartureSectionProps {
  currency: string;
  data: DepartureViewData;
  passengerCount: number;
  selected: SelectedShuttleLeg | null;
  onChoose: (leg: ScheduledLeg | OnRequestLeg) => void;
}

function departureTime(departure: ShuttleDeparture): string {
  return departure.end_time == null
    ? departure.start_time
    : `${departure.start_time} – ${departure.end_time}`;
}

function isScheduledSelected(
  selected: SelectedShuttleLeg | null,
  departure: ShuttleDeparture,
): boolean {
  return selected?.kind === "scheduled"
    && selected.departure.schedule_id === departure.schedule_id;
}

function DepartureRow(props: {
  currency: string;
  date: string;
  departure: ShuttleDeparture;
  onChoose: DepartureSectionProps["onChoose"];
  passengerCount: number;
  route: ShuttleRoute;
  selected: boolean;
}) {
  const departure = props.departure;
  const minimum = departure.effective_min_passengers;
  const minimumBlocked = props.passengerCount < minimum;
  const rowClass = `shuttle-departure${departure.selectable ? "" : " unavailable"}`
    + `${props.selected ? " selected" : ""}`;
  return <article class={rowClass}>
    <div><strong>{departureTime(departure)}</strong><span>{departure.service_label}</span>
      <span class="shuttle-mode-badge">Shared</span>
      {departure.vehicle_type !== null && <span>Vehicle: {departure.vehicle_type.name}</span>}
    </div>
    <div><span>{departure.seats_remaining} seats left</span>
      {departure.low_seat_warning !== null && <small>{departure.low_seat_warning}</small>}</div>
    <strong>{formatMoney(departure.total_for_selection, props.currency)}</strong>
    <button type="button" aria-pressed={props.selected}
      disabled={!departure.selectable || minimumBlocked}
      onClick={() => props.onChoose({ kind: "scheduled", date: props.date, departure,
        route: props.route })}>
      {props.selected ? "Selected" : departure.selectable ? "Choose" : "Unavailable"}
    </button>
    {!departure.selectable && departure.unselectable_reason !== null &&
      <p class="departure-reason">{departure.unselectable_reason}</p>}
    {minimumBlocked && <p class="departure-reason">{minimumMessage(minimum)}</p>}
  </article>;
}

function optionDateBlocked(option: OnRequestAvailability, date: string): boolean {
  return option.earliest_pickup_date !== null && option.earliest_pickup_date !== undefined
    && date < option.earliest_pickup_date;
}

function optionMinimumTime(option: OnRequestAvailability, date: string): string | undefined {
  if (option.earliest_pickup_date !== date) return undefined;
  return option.earliest_pickup_time?.slice(0, 5);
}

function optionTimeBlocked(option: OnRequestAvailability, date: string, time: string): boolean {
  const minimumTime = optionMinimumTime(option, date);
  return minimumTime !== undefined && time !== "" && time < minimumTime;
}

function sharedMinimumTime(options: OnRequestAvailability[], date: string): string | undefined {
  const available = options.filter((option) => !optionDateBlocked(option, date));
  const times = available.map((option) => optionMinimumTime(option, date));
  if (times.length === 0 || times.some((time) => time === undefined)) return undefined;
  return (times as string[]).sort()[0];
}

function sharedTimingError(
  options: OnRequestAvailability[],
  date: string,
  time: string,
): string | undefined {
  const available = options.filter((option) => !optionDateBlocked(option, date));
  if (available.length === 0) {
    return "This date is earlier than the first available date. Go Back to change the date.";
  }
  if (time === "" || available.some((option) => !optionTimeBlocked(option, date, time))) {
    return undefined;
  }
  const minimumTime = sharedMinimumTime(available, date);
  return minimumTime === undefined ? undefined : `Choose a time at or after ${minimumTime}.`;
}

function OnRequestTimeField(props: {
  direction: "outbound" | "return";
  error: string | undefined;
  minimumTime: string | undefined;
  time: string;
  onTime: (time: string) => void;
}) {
  const inputId = `${props.direction}-pickup-time`;
  const hintId = `${inputId}-hint`, errorId = `${inputId}-error`;
  const describedBy = props.error === undefined
    ? props.time === "" ? hintId : undefined
    : errorId;
  return <div class="field shuttle-pickup-time">
    <label for={inputId}>Pickup time</label>
    <input id={inputId} data-shuttle-time={props.direction} type="time"
      min={props.minimumTime} value={props.time} aria-describedby={describedBy}
      aria-invalid={props.error === undefined ? undefined : true}
      onClick={(event) => openNativePicker(event.currentTarget)}
      onInput={(event) => props.onTime(event.currentTarget.value)} />
    {props.time === "" && <span class="field-note" id={hintId}>Pick a time first</span>}
    <FieldError id={errorId} message={props.error} />
  </div>;
}

function isOnRequestSelected(
  selected: SelectedShuttleLeg | null,
  option: OnRequestAvailability,
  date: string,
  time: string,
): boolean {
  return selected?.kind === "on_request" && selected.vehicleTypeId === option.vehicle_type_id
    && selected.date === date && selected.time === time;
}

function OnRequestRow(props: DepartureSectionProps & {
  option: OnRequestAvailability;
  time: string;
}) {
  const option = props.option;
  const privateService = option.service_mode === "private";
  const minimumBlocked = props.passengerCount < (option.effective_min_passengers ?? 1);
  const capacityBlocked = privateService && props.passengerCount > option.seat_capacity;
  const timingBlocked = optionDateBlocked(option, props.data.date)
    || optionTimeBlocked(option, props.data.date, props.time);
  const selected = isOnRequestSelected(props.selected, option, props.data.date, props.time);
  const choose = () => props.onChoose({
    kind: "on_request", date: props.data.date, routeId: option.route_id,
    route: props.data.result.route, serviceMode: option.service_mode, time: props.time,
    vehicleTypeId: option.vehicle_type_id, vehicleTypeName: option.vehicle_type_name,
  });
  return <article class={`shuttle-departure any-time-departure${selected ? " selected" : ""}`}>
    <div><strong>{option.vehicle_type_name}</strong>
      <span class="shuttle-mode-badge">{privateService ? "Private" : "Shared"}</span>
    </div>
    <div><span>{option.seat_capacity} seats</span></div>
    <strong>{formatMoney(option.from_price, props.currency)}</strong>
    <button type="button" aria-pressed={selected}
      title={props.time === "" ? "Pick a time first" : undefined}
      disabled={props.time === "" || timingBlocked || minimumBlocked || capacityBlocked}
      onClick={choose}>{selected ? "Selected" : "Choose"}</button>
    {minimumBlocked && <p class="departure-reason">
      {minimumMessage(option.effective_min_passengers ?? 1)}</p>}
    {capacityBlocked && <FormError>
      This vehicle allows up to {option.seat_capacity} passengers.</FormError>}
  </article>;
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

function onRequestOptions(data: DepartureViewData): OnRequestAvailability[] {
  const options = data.result.on_request_options ?? [];
  if (options.length > 0) return options;
  return data.result.on_request === null || data.result.on_request === undefined
    ? [] : [data.result.on_request];
}

function DepartureSection(props: DepartureSectionProps) {
  const [time, setTime] = useState("");
  const departures = props.data.direction === "outbound"
    ? props.data.result.departures.filter((departure) => departure.selectable)
    : props.data.result.departures;
  const options = onRequestOptions(props.data);
  const title = props.data.direction === "outbound" ? "Choose Departure" : "Choose Return";
  const timingError = sharedTimingError(options, props.data.date, time);
  return <section class={`departure-section ${props.data.direction}`}>
    <h2 class="step-title">{title} · {formatBusinessLocalDate(props.data.date)}</h2>
    {departures.length === 0 && options.length === 0 &&
      <div class="empty-vehicles">{emptyMessage(props.data)}</div>}
    {departures.length > 0 && <div class="shuttle-departures">
      {departures.map((departure) => <DepartureRow key={departure.schedule_id}
        currency={props.currency} date={props.data.date} departure={departure}
        onChoose={props.onChoose} passengerCount={props.passengerCount}
        route={props.data.result.route}
        selected={isScheduledSelected(props.selected, departure)} />)}
    </div>}
    {options.length > 0 && <section class="on-request-section">
      {departures.length > 0 && <h3>Or pick your own time</h3>}
      <OnRequestTimeField direction={props.data.direction} error={timingError}
        minimumTime={sharedMinimumTime(options, props.data.date)} time={time} onTime={setTime} />
      <div class="shuttle-departures any-time-departures">
        {options.map((option) => <OnRequestRow {...props} option={option} time={time}
          key={option.vehicle_type_id} />)}
      </div>
    </section>}
  </section>;
}

export function ShuttleDepartures(props: ShuttleDeparturesProps) {
  return <section class="widget">
    <WidgetHeader businessName={props.businessName} logoUrl={props.logoUrl}
      subtitle="Choose your shuttle departure." />
    <ProgressSteps activeStep={2} steps={["Trip", "Departures", "Confirm"]} />
    {props.notice !== null && <div class="service-area-note" role="alert">{props.notice}</div>}
    {props.loadingOutbound && <p class="return-loading" role="status">Refreshing departures…</p>}
    {props.outboundData === null && !props.loadingOutbound && <div class="empty-vehicles">
      No departures are available for the remembered route. Go back and search again.
    </div>}
    {props.outboundData !== null && <DepartureSection currency={props.currency}
      data={props.outboundData} passengerCount={props.passengerCount}
      selected={props.selectedOutbound} onChoose={props.onChooseOutbound} />}
    {props.loadingReturn && <p class="return-loading" role="status">Finding return departures…</p>}
    {props.returnData !== null && <DepartureSection currency={props.currency}
      data={props.returnData} passengerCount={props.passengerCount}
      selected={props.selectedReturn} onChoose={props.onChooseReturn} />}
    <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
  </section>;
}
