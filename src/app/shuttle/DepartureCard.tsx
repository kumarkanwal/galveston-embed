import type {
  PrivateCarAvailability,
  ShuttleDeparture,
  ShuttleRoute,
} from "../../api/client";
import { formatMoney } from "../../money";
import { minimumMessage } from "./minimum";
import { DepartureImage } from "./DepartureImage";
import { ClockIcon, InfoIcon, PersonIcon, SeatIcon } from "./DepartureIcons";
import type { SelectedShuttleLeg } from "./types";

interface CommonCardProps {
  currency: string;
  onChoose: (leg: SelectedShuttleLeg) => void;
  passengerCount: number;
  route: ShuttleRoute;
  selected: boolean;
}

function Duration({ minutes }: { minutes: number }) {
  return <span class="departure-duration"><ClockIcon class="departure-icon" />
    {minutes} min</span>;
}

function CustomerNote({ note }: { note: string | null }) {
  if (note === null) return null;
  return <div class="departure-note"><InfoIcon class="departure-icon" />
    <span><strong>Customer note:</strong> {note}</span>
  </div>;
}

function CardAction(props: {
  ariaLabel: string;
  currency: string;
  disabled: boolean;
  onChoose: () => void;
  price: string;
  selected: boolean;
}) {
  return <div class="departure-action">
    <strong class="departure-price">{formatMoney(props.price, props.currency)}</strong>
    <button type="button" aria-label={props.ariaLabel} aria-pressed={props.selected}
      disabled={props.disabled} onClick={props.onChoose}>
      {props.selected ? "Selected" : props.disabled ? "Unavailable" : "Choose"}
    </button>
  </div>;
}

function sharedVehicleName(departure: ShuttleDeparture): string {
  return departure.vehicle_type_name ?? departure.vehicle_type?.name ?? "Shuttle vehicle";
}

export function SharedDepartureCard(props: CommonCardProps & {
  date: string;
  departure: ShuttleDeparture;
}) {
  const departure = props.departure;
  const vehicleName = sharedVehicleName(departure);
  const minimumBlocked = props.passengerCount < departure.effective_min_passengers;
  const disabled = !departure.selectable || minimumBlocked;
  const labelId = `departure-${departure.schedule_id}`;
  const cardClass = `shuttle-departure${departure.selectable ? "" : " unavailable"}`
    + `${props.selected ? " selected" : ""}`;
  return <div class={cardClass} role="group" aria-labelledby={labelId}>
    <DepartureImage imageUrl={departure.image_url} vehicleName={vehicleName} />
    <div class="departure-details"><strong class="departure-primary" id={labelId}>
      {departure.start_time}</strong>
      <Duration minutes={departure.duration_minutes} />
      <span class="shuttle-mode-badge">Shared</span>
      <span class="departure-vehicle">Vehicle: {vehicleName}</span>
    </div>
    <div class="departure-capacity"><span><SeatIcon class="departure-icon" />
      {departure.seats_remaining} seats left</span>
      {departure.low_seat_warning !== null && <small>{departure.low_seat_warning}</small>}
    </div>
    <CardAction ariaLabel={`${props.selected ? "Selected" : "Choose"} ${vehicleName} at ${departure.start_time}`}
      currency={props.currency} disabled={disabled} price={departure.total_for_selection}
      selected={props.selected} onChoose={() => props.onChoose({ kind: "scheduled",
        date: props.date, departure, route: props.route })} />
    <CustomerNote note={departure.customer_note} />
    {!departure.selectable && departure.unselectable_reason !== null &&
      <p class="departure-reason">{departure.unselectable_reason}</p>}
    {minimumBlocked && <p class="departure-reason">
      {minimumMessage(departure.effective_min_passengers)}
    </p>}
  </div>;
}

export function PrivateDepartureCard(props: CommonCardProps & {
  car: PrivateCarAvailability;
}) {
  const car = props.car;
  const minimumBlocked = props.passengerCount < car.effective_min_passengers;
  const labelId = `private-${car.route_id}-${car.vehicle_type_id}`;
  return <div class={`shuttle-departure private${props.selected ? " selected" : ""}`}
    role="group" aria-labelledby={labelId}>
    <DepartureImage imageUrl={car.image_url} vehicleName={car.vehicle_type_name} />
    <div class="departure-details"><strong class="departure-primary" id={labelId}>
      {car.vehicle_type_name}</strong>
      <Duration minutes={car.duration_minutes} />
      <span class="shuttle-mode-badge">Private</span>
      <span class="departure-vehicle">Pickup time will be arranged by phone</span>
    </div>
    <div class="departure-capacity"><span><PersonIcon class="departure-icon" />
      Up to {car.seat_capacity} passengers</span></div>
    <CardAction ariaLabel={`${props.selected ? "Selected" : "Choose"} ${car.vehicle_type_name}`}
      currency={props.currency} disabled={minimumBlocked} price={car.total_for_selection}
      selected={props.selected} onChoose={() => props.onChoose({ kind: "private",
        date: car.service_date, car, route: props.route })} />
    <CustomerNote note={car.customer_note} />
    {minimumBlocked && <p class="departure-reason">
      {minimumMessage(car.effective_min_passengers)}
    </p>}
  </div>;
}
