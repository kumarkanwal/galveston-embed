import { useState } from "preact/hooks";

import type { OnRequestAvailability, ShuttleDeparture, ShuttleRoute } from "../../api/client";
import { formatMoney } from "../../money";
import { openNativePicker } from "../shell/native-picker";
import { FormError } from "../trip/FieldError";
import { ProgressSteps } from "../trip/ProgressSteps";
import { WidgetHeader } from "../shell/WidgetHeader";
import { minimumMessage } from "./minimum";
import { pricingText } from "./pricing";
import type { DepartureViewData, OnRequestLeg, ScheduledLeg } from "./types";

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
  onBack: () => void;
  onChooseOutbound: (leg: ScheduledLeg | OnRequestLeg) => void;
  onChooseReturn: (leg: ScheduledLeg | OnRequestLeg) => void;
  onDateChange: (direction: "outbound" | "return", date: string) => void;
}

interface DepartureSectionProps {
  currency: string;
  data: DepartureViewData;
  passengerCount: number;
  onChoose: (leg: ScheduledLeg | OnRequestLeg) => void;
  onDateChange: ShuttleDeparturesProps["onDateChange"];
}

interface TimingProps {
  date: string;
  direction: "outbound" | "return";
  inputId: string;
  minimumDate: string | null | undefined;
  minimumTime: string | undefined;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}

function OnRequestTiming(props: TimingProps) {
  return <div class="field-row date-time-grid shuttle-private-timing">
    <div class="field"><label for={`${props.inputId}-date`}>Pickup Date</label>
      <input id={`${props.inputId}-date`} data-shuttle-date={props.direction} type="date"
        min={props.minimumDate ?? undefined} value={props.date}
        onClick={(event) => openNativePicker(event.currentTarget)}
        onInput={(event) => props.onDate(event.currentTarget.value)} />
    </div>
    <div class="field"><label for={`${props.inputId}-time`}>Pickup Time</label>
      <input id={`${props.inputId}-time`} data-shuttle-time={props.direction}
        type="time" min={props.minimumTime} value={props.time}
        onClick={(event) => openNativePicker(event.currentTarget)}
        onInput={(event) => props.onTime(event.currentTarget.value)} />
    </div>
  </div>;
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
  passengerCount: number;
  route: ShuttleRoute;
}) {
  const departure = props.departure;
  const minimum = departure.effective_min_passengers;
  const minimumBlocked = props.passengerCount < minimum;
  return <article class={`shuttle-departure${departure.selectable ? "" : " unavailable"}`}>
    <div><strong>{departureTime(departure)}</strong><span>{departure.service_label}</span>
      <span class="shuttle-mode-badge">Shared Shuttle</span>
      {departure.vehicle_type !== null && <span>Vehicle: {departure.vehicle_type.name}</span>}
    </div>
    <div><span>{departure.seats_remaining} seats left</span>
      {departure.low_seat_warning !== null && <small>{departure.low_seat_warning}</small>}</div>
    <strong>{formatMoney(departure.total_for_selection, props.currency)}</strong>
    <button type="button" disabled={!departure.selectable || minimumBlocked}
      onClick={() => props.onChoose({ kind: "scheduled", date: props.date, departure,
        route: props.route })}>
      {departure.selectable ? "Choose" : "Unavailable"}
    </button>
    {!departure.selectable && departure.unselectable_reason !== null &&
      <p class="departure-reason">{departure.unselectable_reason}</p>}
    {minimumBlocked && <p class="departure-reason">{minimumMessage(minimum)}</p>}
  </article>;
}

function OnRequestChoice(props: DepartureSectionProps & { option: OnRequestAvailability }) {
  const option = props.option;
  const [date, setDate] = useState(props.data.date), [time, setTime] = useState("");
  const serviceMode = option.service_mode ?? "shared";
  const privateService = serviceMode === "private";
  const minimum = option.effective_min_passengers ?? 1;
  const minimumBlocked = props.passengerCount < minimum;
  const capacityBlocked = privateService && props.passengerCount > option.seat_capacity;
  const inputId = `${props.data.direction}-${option.vehicle_type_id}`;
  const earliestDate = option.earliest_pickup_date;
  const beforeEarliestDate = earliestDate !== null && earliestDate !== undefined
    && date < earliestDate;
  const minTime = earliestDate === date
    ? option.earliest_pickup_time?.slice(0, 5)
    : undefined;
  const beforeEarliestTime = minTime !== undefined && time !== "" && time < minTime;
  const changeDate = (value: string) => {
    setDate(value); setTime(""); props.onDateChange(props.data.direction, value);
  };
  const choose = () => props.onChoose({
    kind: "on_request",
    date,
    routeId: option.route_id,
    route: props.data.result.route,
    serviceMode,
    time,
    vehicleTypeId: option.vehicle_type_id, vehicleTypeName: option.vehicle_type_name,
  });
  return <section class="on-request-choice">
    <h3>Choose your pickup time</h3>
    <span class="shuttle-mode-badge">
      {privateService ? "Private Shuttle" : "Shared Shuttle"}
    </span>
    {privateService && <p>Private vehicle for your group</p>}
    <p>Vehicle: <strong>{option.vehicle_type_name}</strong></p>
    <p>{option.seat_capacity} seats available</p>
    {pricingText(option, props.currency).map((line) => <p class="shuttle-price-rule">{line}</p>)}
    <OnRequestTiming date={date} direction={props.data.direction} inputId={inputId}
      minimumDate={earliestDate} minimumTime={minTime} time={time}
      onDate={changeDate} onTime={setTime} />
    <button class="check-pricing" type="button"
      disabled={time === "" || beforeEarliestDate || beforeEarliestTime
        || minimumBlocked || capacityBlocked}
      onClick={choose}>Choose Time</button>
    {minimumBlocked && <FormError>{minimumMessage(minimum)}</FormError>}
    {capacityBlocked && <FormError>This vehicle allows up to {option.seat_capacity} passengers.</FormError>}
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
  const optionList = props.data.result.on_request_options ?? [];
  const options = optionList.length > 0 ? optionList
    : props.data.result.on_request == null ? [] : [props.data.result.on_request];
  const title = props.data.direction === "outbound" ? "Choose Departure" : "Choose Return";
  return <section class={`departure-section ${props.data.direction}`}>
    <h2 class="step-title">{title}</h2>
    {departures.length === 0 && options.length === 0 &&
      <div class="empty-vehicles">{emptyMessage(props.data)}</div>}
    {departures.length > 0 && <div class="shuttle-departures">
      {departures.map((departure) => <DepartureCard key={departure.schedule_id}
        currency={props.currency} date={props.data.date} departure={departure}
        onChoose={props.onChoose} passengerCount={props.passengerCount}
        route={props.data.result.route} />)}
    </div>}
    {options.map((option) => <OnRequestChoice {...props} option={option}
      key={option.vehicle_type_id} />)}
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
      onChoose={props.onChooseOutbound} onDateChange={props.onDateChange} />}
    {props.loadingReturn && <p class="return-loading" role="status">Finding return departures…</p>}
    {props.returnData !== null && <DepartureSection currency={props.currency}
      data={props.returnData} passengerCount={props.passengerCount}
      onChoose={props.onChooseReturn} onDateChange={props.onDateChange} />}
    <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
  </section>;
}
