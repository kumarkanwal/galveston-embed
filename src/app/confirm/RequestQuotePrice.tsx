import { CarSeatsField } from "./Charges";

interface RequestQuotePriceProps {
  carSeatError: string | undefined;
  carSeatMax: number;
  carSeats: number;
  currency: string;
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
    <CarSeatsField carSeatError={props.carSeatError} carSeatMax={props.carSeatMax}
      carSeatPrice={undefined} carSeats={props.carSeats} currency={props.currency}
      onCarSeatsChange={props.onCarSeatsChange} />
  </section>;
}
