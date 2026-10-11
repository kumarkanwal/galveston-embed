import { FieldError } from "../trip/FieldError";
import type { ConfirmErrors, ConfirmFormState } from "./types";

interface CustomerFieldsProps {
  errors: ConfirmErrors;
  form: ConfirmFormState;
  update: <Key extends keyof ConfirmFormState>(key: Key, value: ConfirmFormState[Key]) => void;
}

interface TextFieldProps {
  error: string | undefined;
  field: "firstName" | "lastName" | "phone" | "email";
  label: string;
  maxLength: number | undefined;
  placeholder: string;
  value: string;
  update: CustomerFieldsProps["update"];
}

function TextField(props: TextFieldProps) {
  const icon = props.field === "phone" ? "☎" : props.field === "email" ? "@" : null;
  const describedBy = props.error === undefined ? {} : {
    "aria-describedby": `${props.field}-error`,
  };
  const length = props.maxLength === undefined ? {} : { maxLength: props.maxLength };
  const input = <input id={props.field} data-confirm-field={props.field}
    value={props.value} placeholder={props.placeholder}
    {...length} aria-invalid={props.error !== undefined} {...describedBy}
    onInput={(event) => props.update(props.field, event.currentTarget.value)} />;
  return <div class="field">
    <label for={props.field}>{props.label}</label>
    {icon === null ? input : <div class="input-with-icon">{input}<span aria-hidden="true">{icon}</span></div>}
    <FieldError id={`${props.field}-error`} message={props.error} />
  </div>;
}

export function CustomerFields({ errors, form, update }: CustomerFieldsProps) {
  return <>
    <div class="field-row">
      <TextField field="firstName" label="First Name" placeholder="First Name" maxLength={100}
        value={form.firstName} error={errors.firstName} update={update} />
      <TextField field="lastName" label="Last Name" placeholder="Last Name" maxLength={100}
        value={form.lastName} error={errors.lastName} update={update} />
    </div>
    <TextField field="phone" label="Phone" placeholder="Phone" maxLength={50}
      value={form.phone} error={errors.phone} update={update} />
    <TextField field="email" label="Email" placeholder="Email address"
      maxLength={undefined} value={form.email} error={errors.email} update={update} />
  </>;
}
