import type {
  Business,
  BusinessPayments,
  PaymentMethod,
  ShuttleBookingRequest,
  TaxiBookingRequest,
} from "../../api/client";

export function cardPaymentSettings(business: Business): BusinessPayments | null {
  return business.payments?.card_available === true ? business.payments : null;
}

export const PAYMENT_UNAVAILABLE_MESSAGE =
  "Online booking is temporarily unavailable. Please contact us to book.";

export interface PaymentAvailability {
  card: boolean;
  cash: boolean;
  defaultMethod: PaymentMethod | null;
}

export function paymentAvailability(
  business: Business,
  allowCard = true,
): PaymentAvailability {
  const methods = business.settings.payment_methods;
  const cash = methods.includes("cash");
  const card = allowCard && methods.includes("online") && cardPaymentSettings(business) !== null;
  return { card, cash, defaultMethod: cash ? "cash" : card ? "online" : null };
}

export function paymentLabel(method: PaymentMethod): string {
  return method === "online" ? "Card" : "Cash";
}

export function withPaymentToken<T extends TaxiBookingRequest | ShuttleBookingRequest>(
  body: T,
  token: string,
): T {
  return { ...body, payment: { ...body.payment, payment_method_token: token } };
}
