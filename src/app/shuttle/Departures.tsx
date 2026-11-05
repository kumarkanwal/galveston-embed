import { formatBusinessLocalDate } from "../../time";
import { WidgetHeader } from "../shell/WidgetHeader";
import { ProgressSteps } from "../trip/ProgressSteps";
import { PrivateDepartureCard, SharedDepartureCard } from "./DepartureCard";
import type {
  DepartureViewData,
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
  onChooseOutbound: (leg: SelectedShuttleLeg) => void;
  onChooseReturn: (leg: SelectedShuttleLeg) => void;
}

interface DepartureSectionProps {
  currency: string;
  data: DepartureViewData;
  passengerCount: number;
  selected: SelectedShuttleLeg | null;
  onChoose: (leg: SelectedShuttleLeg) => void;
}

function isScheduledSelected(
  selected: SelectedShuttleLeg | null,
  scheduleId: string,
): boolean {
  return selected?.kind === "scheduled"
    && selected.departure.schedule_id === scheduleId;
}

function isPrivateSelected(
  selected: SelectedShuttleLeg | null,
  routeId: string,
  vehicleTypeId: string,
  serviceDate: string,
): boolean {
  return selected?.kind === "private"
    && selected.car.route_id === routeId
    && selected.car.vehicle_type_id === vehicleTypeId
    && selected.date === serviceDate;
}

function DepartureSection(props: DepartureSectionProps) {
  const departures = props.data.direction === "outbound"
    ? props.data.result.departures.filter((departure) => departure.selectable)
    : props.data.result.departures;
  const orderedDepartures = [...departures]
    .sort((first, second) => first.start_time.localeCompare(second.start_time));
  const title = props.data.direction === "outbound" ? "Choose Departure" : "Choose Return";
  const privateCars = props.data.result.private_cars ?? [];
  const empty = departures.length === 0 && privateCars.length === 0;
  return <section class={`departure-section ${props.data.direction}`}>
    <h2 class="step-title">{title} · {formatBusinessLocalDate(props.data.date)}</h2>
    {empty && <div class="empty-vehicles">
      No scheduled departures on this date. Please try another date.
    </div>}
    {!empty && <div class="shuttle-departures">
      {orderedDepartures.map((departure) => <SharedDepartureCard key={departure.schedule_id}
        currency={props.currency} date={props.data.date} departure={departure}
        onChoose={props.onChoose} passengerCount={props.passengerCount}
        route={props.data.result.route}
        selected={isScheduledSelected(props.selected, departure.schedule_id)} />)}
      {privateCars.map((car) => <PrivateDepartureCard key={`${car.route_id}:${car.vehicle_type_id}`}
        car={car} currency={props.currency} onChoose={props.onChoose}
        passengerCount={props.passengerCount} route={props.data.result.route}
        selected={isPrivateSelected(props.selected, car.route_id, car.vehicle_type_id,
          car.service_date)} />)}
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
