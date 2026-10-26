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

export function paymentLabel(method: PaymentMethod): string {
  return method === "online" ? "Card" : "Cash";
}

export function withPaymentToken<T extends TaxiBookingRequest | ShuttleBookingRequest>(
  body: T,
  token: string,
): T {
  return { ...body, payment: { ...body.payment, payment_method_token: token } };
}
