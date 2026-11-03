import type { ShuttleDeparture, ShuttleRoute } from "../../api/client";
import { formatMoney } from "../../money";
import { formatBusinessLocalDate } from "../../time";
import { WidgetHeader } from "../shell/WidgetHeader";
import { ProgressSteps } from "../trip/ProgressSteps";
import { minimumMessage } from "./minimum";
import type {
  DepartureViewData,
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
  onChooseOutbound: (leg: ScheduledLeg) => void;
  onChooseReturn: (leg: ScheduledLeg) => void;
}

interface DepartureSectionProps {
  currency: string;
  data: DepartureViewData;
  passengerCount: number;
  selected: SelectedShuttleLeg | null;
  onChoose: (leg: ScheduledLeg) => void;
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
    <div><strong>{departureTime(departure)}</strong>
      <span>{departure.duration_minutes} min</span>
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

function DepartureSection(props: DepartureSectionProps) {
  const departures = props.data.direction === "outbound"
    ? props.data.result.departures.filter((departure) => departure.selectable)
    : props.data.result.departures;
  const title = props.data.direction === "outbound" ? "Choose Departure" : "Choose Return";
  return <section class={`departure-section ${props.data.direction}`}>
    <h2 class="step-title">{title} · {formatBusinessLocalDate(props.data.date)}</h2>
    {departures.length === 0 && <div class="empty-vehicles">
      No scheduled departures on this date. Please try another date.
    </div>}
    {departures.length > 0 && <div class="shuttle-departures">
      {departures.map((departure) => <DepartureRow key={departure.schedule_id}
        currency={props.currency} date={props.data.date} departure={departure}
        onChoose={props.onChoose} passengerCount={props.passengerCount}
        route={props.data.result.route}
        selected={isScheduledSelected(props.selected, departure)} />)}
    </div>}
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
