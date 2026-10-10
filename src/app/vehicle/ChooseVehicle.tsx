import type { Business, QuotedVehicle, TaxiQuoteResponse } from "../../api/client";
import { ProgressSteps } from "../trip/ProgressSteps";
import { VehicleRow } from "./VehicleRow";

interface ChooseVehicleProps {
  business: Business;
  onBack: () => void;
  onChoose: (vehicle: QuotedVehicle) => void;
  quote: TaxiQuoteResponse;
}

export function ChooseVehicle(props: ChooseVehicleProps) {
  const vehicles = props.quote.vehicles ?? [];
  return <section class="widget">
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps activeStep={2} />
    <h2 class="step-title">Choose Your Vehicle Type</h2>
    {props.quote.out_of_service_area && <div class="service-area-note" role="status">
      This trip is outside our standard service area. Choose a vehicle and we'll send you a quote.
    </div>}
    {vehicles.length === 0
      ? <div class="empty-vehicles">No vehicles are available for this trip. Please contact us.</div>
      : <div class="vehicle-list">
        <div class="vehicle-headings" aria-hidden="true">
          <span>Vehicle Type</span><span>Base Fare</span><span>Choose</span>
        </div>
        {vehicles.map((vehicle) => <VehicleRow key={vehicle.vehicle_type_id}
          currency={props.business.currency} onChoose={props.onChoose} vehicle={vehicle} />)}
      </div>}
    <button class="back-button" type="button" onClick={props.onBack}>↶ Back</button>
  </section>;
}
