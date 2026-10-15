export interface ConfirmFormState {
  acceptedTerms: boolean;
  comments: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export type ConfirmField = keyof ConfirmFormState | "breakdown" | "carSeats" | "comments";
export type ConfirmErrors = Partial<Record<ConfirmField, string>>;
