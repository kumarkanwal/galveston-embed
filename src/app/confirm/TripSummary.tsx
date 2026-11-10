import type { QuotedVehicle, TaxiQuoteResponse } from "../../api/client";
import { formatBusinessLocalDateTime } from "../../time";
import type { TripFormState } from "../trip/types";
import { ConfirmIcon } from "./ConfirmIcon";

interface TripSummaryProps {
  form: TripFormState;
  quote: TaxiQuoteResponse;
  serviceName: string;
  vehicle: QuotedVehicle;
}

function VehiclePhoto({ vehicle }: { vehicle: QuotedVehicle }) {
  if (vehicle.photo_url === null || vehicle.photo_url === undefined) {
    return <div class="vehicle-photo-placeholder">No photo available</div>;
  }
  return <img class="vehicle-photo" src={vehicle.photo_url} alt={`${vehicle.name} vehicle`} />;
}

function tripAddress(form: TripFormState, kind: "pickup" | "dropoff"): string {
  if (kind === "pickup" && form.service === "airport_pickup") return form.pickupAirportName;
  if (kind === "dropoff" && form.service === "airport_dropoff") return form.dropoffAirportName;
  return form[`${kind}Address`]?.address ?? "";
}

export function TripSummary(props: TripSummaryProps) {
  const distance = props.quote.distance_miles;
  return <section class="trip-summary">
    <h2 tabIndex={-1}>Trip Summary</h2>
    <div class="summary-content">
      <VehiclePhoto vehicle={props.vehicle} />
      <div class="summary-details">
        <div class="confirm-summary-row"><ConfirmIcon name="calendar" />
          <h3>{props.serviceName} on {formatBusinessLocalDateTime(
            props.form.pickupDate, props.form.pickupTime,
          )}</h3></div>
        <div class="confirm-summary-row"><ConfirmIcon name="vehicle" />
          <span><strong>Vehicle:</strong> {props.vehicle.name}
            {distance == null ? "" : ` (${distance} mi)`}</span></div>
        {props.form.service === "round_trip" && <p class="summary-return confirm-summary-row">
          <ConfirmIcon name="calendar" /><span>Return: {formatBusinessLocalDateTime(
            props.form.returnDate, props.form.returnTime,
          )}</span></p>}
        <div class="summary-counts">
          <div class="confirm-summary-row"><ConfirmIcon name="person" /><span>
            {props.form.passengers}{props.form.passengers === 1 ? " passenger" : " passengers"}
          </span></div>
          <div class="confirm-summary-row"><ConfirmIcon name="luggage" /><span>
            {props.form.largeBags} check-in · {props.form.smallBags} carry-on
          </span></div>
        </div>
        <div class="summary-address confirm-summary-row"><ConfirmIcon name="route" /><span>
          {tripAddress(props.form, "pickup")} → {tripAddress(props.form, "dropoff")}
        </span></div>
      </div>
    </div>
  </section>;
}
