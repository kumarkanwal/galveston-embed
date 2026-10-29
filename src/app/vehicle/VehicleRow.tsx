import type { QuotedVehicle } from "../../api/client";
import { formatMoney } from "../../money";
import { useState } from "preact/hooks";

interface VehicleRowProps {
  currency: string;
  onChoose: (vehicle: QuotedVehicle) => void;
  vehicle: QuotedVehicle;
}

function fare(vehicle: QuotedVehicle, currency: string): string | null {
  if (vehicle.quote_status === "request_quote") return "Request a Quote";
  if (vehicle.quote_status === "unavailable") return null;
  if (vehicle.base_price === null || vehicle.base_price === undefined) return "Price unavailable";
  return formatMoney(vehicle.base_price, currency);
}

export function unavailableVehicleText(reason: string | null | undefined): string {
  if (reason === "capacity") return "Too many passengers or bags for this vehicle";
  if (reason === "blackout" || reason === "time" || reason == null) {
    return "Not available at this time";
  }
  return "Not available";
}

function httpsPhotoUrl(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function VehiclePhotoPlaceholder({ name }: { name: string }) {
  return <div class="vehicle-photo-frame vehicle-photo-placeholder"
    role="img" aria-label={`${name} image unavailable`}>
    <svg class="vehicle-placeholder-icon" viewBox="0 0 64 32" aria-hidden="true">
      <path d="M12 22h-4v-7l6-2 6-8h24l7 8 5 2v7h-4a7 7 0 0 1-14 0H26a7 7 0 0 1-14 0Zm5 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm24 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM22 9l-3 4h27l-4-4H22Z" />
    </svg>
  </div>;
}

function VehiclePhoto({ vehicle }: { vehicle: QuotedVehicle }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoUrl = httpsPhotoUrl(vehicle.photo_url);
  if (photoUrl === null || photoUrl === failedUrl) {
    return <VehiclePhotoPlaceholder name={vehicle.name} />;
  }
  return <div class="vehicle-photo-frame">
    <img class="vehicle-photo" src={photoUrl} alt={vehicle.name} loading="lazy"
      width="110" height="70" onError={() => setFailedUrl(photoUrl)} />
  </div>;
}

export function VehicleRow({ currency, onChoose, vehicle }: VehicleRowProps) {
  const unavailable = vehicle.quote_status === "unavailable";
  const price = fare(vehicle, currency);
  return <article class={`vehicle-row${unavailable ? " unavailable" : ""}`}
    aria-disabled={unavailable || undefined}>
    <VehiclePhoto vehicle={vehicle} />
    <div class="vehicle-summary">
      <h3>{vehicle.name}</h3>
      <div class="vehicle-capacity">
        <span><span aria-hidden="true">♟ </span>{vehicle.passenger_capacity}
          {vehicle.passenger_capacity === 1 ? " passenger" : " passengers"}</span>
        <span><span aria-hidden="true">· ▣ </span>{vehicle.luggage_capacity}
          {vehicle.luggage_capacity === 1 ? " bag" : " bags"}</span>
      </div>
    </div>
    <div class="vehicle-fare">{price}</div>
    {unavailable
      ? <span class="vehicle-unavailable">{unavailableVehicleText(vehicle.unavailable_reason)}</span>
      : <button class="vehicle-choose" type="button" aria-label={`Choose ${vehicle.name}`}
        onClick={() => onChoose(vehicle)}>Choose</button>}
  </article>;
}
