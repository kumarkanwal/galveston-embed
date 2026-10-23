export interface ConfirmFormState {
  acceptedTerms: boolean;
  comments: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export type ConfirmField =
  | keyof ConfirmFormState
  | "breakdown"
  | "address"
  | "carSeats"
  | "comments"
  | "promoCode";
export type ConfirmErrors = Partial<Record<ConfirmField, string>>;
