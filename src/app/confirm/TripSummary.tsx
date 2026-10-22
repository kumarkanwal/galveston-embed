import type { QuotedVehicle, TaxiQuoteResponse } from "../../api/client";
import { formatBusinessLocalDateTime } from "../../time";
import type { TripFormState } from "../trip/types";

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
      <div>
        <h3>{props.serviceName} on {formatBusinessLocalDateTime(
          props.form.pickupDate, props.form.pickupTime,
        )} - Vehicle: {props.vehicle.name}{distance == null ? "" : ` (${distance} mi)`}</h3>
        {props.form.service === "round_trip" && <p class="summary-return">
          Return: {formatBusinessLocalDateTime(props.form.returnDate, props.form.returnTime)}
        </p>}
        <div class="summary-counts">
          <span aria-label={`${props.form.passengers} passengers`}>♟ {props.form.passengers}</span>
          <span aria-label={`${props.form.largeBags} check-in or trunk bags`}>
            ▣ {props.form.largeBags}
          </span>
          <span aria-label={`${props.form.smallBags} carry-on bags`}>▫ {props.form.smallBags}</span>
        </div>
        <div class="summary-address"><span class="pickup-pin">●</span>{tripAddress(props.form, "pickup")}</div>
        <div class="summary-address"><span class="dropoff-pin">●</span>{tripAddress(props.form, "dropoff")}</div>
      </div>
    </div>
  </section>;
}
