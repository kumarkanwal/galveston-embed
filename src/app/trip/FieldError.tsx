import type { ComponentChildren } from "preact";

interface FieldErrorProps {
  id: string;
  message: string | undefined;
}
export function ErrorIcon() {
  return <span class="error-icon" aria-hidden="true" />;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (message === undefined) return null;
  return <div class="field-error" id={id} role="alert">
    <ErrorIcon /><span>{message}</span>
  </div>;
}

export function FormError(props: { children: ComponentChildren }) {
  return <div class="form-error" role="alert">
    <ErrorIcon /><span>{props.children}</span>
  </div>;
}
