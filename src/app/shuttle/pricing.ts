import type { OnRequestAvailability, ShuttlePricingSummary } from "../../api/client";
import { formatMoney } from "../../money";

function passengerBand(minimum: number, maximum: number | null): string {
  if (maximum === minimum) return `${minimum} ${minimum === 1 ? "passenger" : "passengers"}`;
  if (maximum === null) return `${minimum}+ passengers`;
  return `${minimum}–${maximum} passengers`;
}

export function tierRule(summary: ShuttlePricingSummary, currency: string): string {
  return (summary.tiers ?? []).map((tier) => {
    const suffix = tier.price_type === "per_person" ? " each" : " total";
    return `${passengerBand(tier.min_passengers, tier.max_passengers)} `
      + `${formatMoney(tier.amount, currency)}${suffix}`;
  }).join(" · ");
}

export function pricingText(option: OnRequestAvailability, currency: string): string[] {
  const summary = option.pricing;
  if (summary?.mode === "tiered") {
    return [tierRule(summary, currency), `Live total: ${formatMoney(option.from_price, currency)}`];
  }
  if (summary?.mode === "fixed_vehicle" && summary.fixed_price !== null
    && summary.fixed_price !== undefined) {
    return [`${formatMoney(summary.fixed_price, currency)} per vehicle `
      + `(up to ${option.seat_capacity} passengers)`];
  }
  return [`From ${formatMoney(option.from_price, currency)}`];
}
