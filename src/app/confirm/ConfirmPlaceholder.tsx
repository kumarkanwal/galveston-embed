import type { QuotedVehicle } from "../../api/client";
import { ProgressSteps } from "../trip/ProgressSteps";

interface ConfirmPlaceholderProps {
  onBack: () => void;
  vehicle: QuotedVehicle;
}

export function ConfirmPlaceholder({ onBack, vehicle }: ConfirmPlaceholderProps) {
  return <section class="widget">
    <header class="widget-heading">
      <h1>Reservations</h1>
      <p>Book a trip or request a quote by filling out the form below.</p>
    </header>
    <ProgressSteps activeStep={3} />
    <div class="confirm-placeholder">
      <h2>{vehicle.name}</h2>
      <p>Confirm — coming next</p>
    </div>
    <button class="back-button" type="button" onClick={onBack}>↶ Back</button>
  </section>;
}
