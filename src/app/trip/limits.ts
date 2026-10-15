import type { Business } from "../../api/client";

export interface PartyLimits {
  luggage: number;
  passengers: number;
}

export const QUOTE_SCHEMA_LIMITS: PartyLimits = {
  luggage: 99,
  passengers: 99,
};

export function partyLimits(business: Business): PartyLimits | null {
  if (business.max_passengers === null || business.max_passengers === undefined) return null;
  if (business.max_luggage === null || business.max_luggage === undefined) return null;
  return {
    luggage: Math.min(business.max_luggage, QUOTE_SCHEMA_LIMITS.luggage),
    passengers: Math.min(business.max_passengers, QUOTE_SCHEMA_LIMITS.passengers),
  };
}
