import { useRef, useState } from "preact/hooks";

import { firstConfirmError, validateConfirm } from "./validation";
import type { ConfirmErrors, ConfirmFormState } from "./types";

const INITIAL_FORM: ConfirmFormState = {
  acceptedTerms: false,
  comments: "",
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
};

export function useConfirmForm(
  breakdownReady: boolean,
  onChange: () => void,
  onValid: (form: ConfirmFormState) => void,
) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<ConfirmErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const update = <Key extends keyof ConfirmFormState>(key: Key, value: ConfirmFormState[Key]) => {
    onChange();
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    const nextErrors = validateConfirm(form, breakdownReady);
    setErrors(nextErrors);
    const firstError = firstConfirmError(nextErrors);
    if (firstError !== null) {
      formRef.current?.querySelector<HTMLElement>(`[data-confirm-field="${firstError}"]`)?.focus();
      return;
    }
    onValid(form);
  };
  return { errors, form, formRef, submit, update };
}
