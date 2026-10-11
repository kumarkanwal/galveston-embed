import type { QuotedVehicle } from "../../api/client";
import { formatMoney } from "../../money";

interface VehicleRowProps {
  currency: string;
  onChoose: (vehicle: QuotedVehicle) => void;
  vehicle: QuotedVehicle;
}

function fare(vehicle: QuotedVehicle, currency: string): string {
  if (vehicle.quote_status === "request_quote") return "Request a Quote";
  if (vehicle.quote_status === "unavailable") return "Unavailable";
  if (vehicle.base_price === null || vehicle.base_price === undefined) return "Price unavailable";
  return formatMoney(vehicle.base_price, currency);
}

function VehiclePhoto({ vehicle }: { vehicle: QuotedVehicle }) {
  if (vehicle.photo_url === null || vehicle.photo_url === undefined) {
    return <div class="vehicle-photo-placeholder">No photo available</div>;
  }
  return <img class="vehicle-photo" src={vehicle.photo_url} alt={`${vehicle.name} vehicle`} />;
}

export function VehicleRow({ currency, onChoose, vehicle }: VehicleRowProps) {
  const unavailable = vehicle.quote_status === "unavailable";
  return <article class={`vehicle-row${unavailable ? " unavailable" : ""}`}>
    <VehiclePhoto vehicle={vehicle} />
    <div class="vehicle-summary">
      <h3>{vehicle.name}</h3>
      <div class="vehicle-capacity">
        <span aria-label={`${vehicle.passenger_capacity} passengers`}>
          ♟ {vehicle.passenger_capacity}
        </span>
        <span aria-label={`${vehicle.luggage_capacity} luggage`}>
          ▣ {vehicle.luggage_capacity}
        </span>
      </div>
    </div>
    <div class="vehicle-fare">{fare(vehicle, currency)}</div>
    <button class="vehicle-choose" type="button" disabled={unavailable}
      onClick={() => onChoose(vehicle)}>{unavailable ? "Unavailable" : "Choose"}</button>
  </article>;
}
