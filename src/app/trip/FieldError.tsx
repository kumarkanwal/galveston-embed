interface FieldErrorProps {
  id: string;
  message: string | undefined;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (message === undefined) return null;
  return <div class="field-error" id={id} role="alert">{message}</div>;
}
