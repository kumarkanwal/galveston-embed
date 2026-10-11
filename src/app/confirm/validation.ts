import type { ConfirmErrors, ConfirmField, ConfirmFormState } from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOCUS_ORDER: ConfirmField[] = [
  "firstName", "lastName", "phone", "email", "acceptedTerms", "breakdown",
];

export function validateConfirm(
  form: ConfirmFormState,
  breakdownReady: boolean,
): ConfirmErrors {
  const errors: ConfirmErrors = {};
  if (form.firstName.trim() === "") errors.firstName = "Enter your first name.";
  if (form.lastName.trim() === "") errors.lastName = "Enter your last name.";
  if (form.phone !== "" && !/\d/.test(form.phone)) {
    errors.phone = "Phone must contain at least one digit.";
  }
  if (form.email.trim() === "") errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.acceptedTerms) errors.acceptedTerms = "You must accept the Terms & Conditions.";
  if (!breakdownReady) errors.breakdown = "The price breakdown must finish loading.";
  return errors;
}

export function firstConfirmError(errors: ConfirmErrors): ConfirmField | null {
  return FOCUS_ORDER.find((field) => errors[field] !== undefined) ?? null;
}
