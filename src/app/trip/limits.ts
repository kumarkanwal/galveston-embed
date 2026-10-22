import type { Business } from "../../api/client";

export interface PartyLimits {
  bags: number;
  passengers: number;
}

export const BAG_COUNT_SCHEMA_LIMIT = 99;

export const QUOTE_SCHEMA_LIMITS: PartyLimits = {
  bags: BAG_COUNT_SCHEMA_LIMIT * 2,
  passengers: 99,
};

export function partyLimits(business: Business): PartyLimits | null {
  if (business.max_passengers === null || business.max_passengers === undefined) return null;
  if (business.max_luggage === null || business.max_luggage === undefined) return null;
  return {
    bags: Math.min(business.max_luggage, QUOTE_SCHEMA_LIMITS.bags),
    passengers: Math.min(business.max_passengers, QUOTE_SCHEMA_LIMITS.passengers),
  };
}
