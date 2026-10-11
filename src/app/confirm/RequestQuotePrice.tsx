import { CarSeatsField } from "./Charges";

interface RequestQuotePriceProps {
  carSeats: number;
  onCarSeatsChange: (count: number) => void;
  outOfServiceArea: boolean;
}

export function RequestQuotePrice(props: RequestQuotePriceProps) {
  return <section class="request-quote-price">
    <h2>Price</h2>
    {props.outOfServiceArea && <div class="service-area-note" role="status">
      This trip is outside our standard service area. We'll send you a quote.
    </div>}
    <p><strong>Request a Quote</strong> — we'll send you a quote for this trip.</p>
    <CarSeatsField carSeats={props.carSeats} onCarSeatsChange={props.onCarSeatsChange} />
  </section>;
}
