import type { Business, QuotedVehicle, TaxiQuoteResponse } from "../../api/client";
import { useEffect, useRef } from "preact/hooks";
import { ProgressSteps } from "../trip/ProgressSteps";
import { VehicleRow } from "./VehicleRow";
import { WidgetHeader } from "../shell/WidgetHeader";

interface ChooseVehicleProps {
  autoFocusHeading?: boolean;
  business: Business;
  notice: string | null;
  onBack: () => void;
  onChoose: (vehicle: QuotedVehicle) => void;
  quote: TaxiQuoteResponse;
}
export function ChooseVehicle(props: ChooseVehicleProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const vehicles = props.quote.vehicles ?? [];
  useEffect(() => {
    if (props.autoFocusHeading) headingRef.current?.focus();
  }, [props.autoFocusHeading]);
  return <section class="widget">
    <WidgetHeader businessName={props.business.name} logoUrl={props.business.logo_url}
      subtitle="Book a trip or request a quote by filling out the form below." />
    <ProgressSteps activeStep={2} />
    <h2 class="step-title" ref={headingRef} tabIndex={-1}>Choose Your Vehicle Type</h2>
    {props.notice !== null && <div class="service-area-note" role="alert">
      {props.notice} Choose another vehicle, or go back to select another time.
    </div>}
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
