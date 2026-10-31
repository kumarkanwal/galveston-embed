import type { ComponentChildren } from "preact";

export function ChevronIcon(props: { className?: string | undefined }) {
  const className = props.className === undefined
    ? "chevron-icon" : `chevron-icon ${props.className}`;
  return <svg class={className} viewBox="0 0 16 16" aria-hidden="true"
    focusable="false"><path d="m4 6 4 4 4-4" /></svg>;
}

export function FieldChevron(props: { open?: boolean | undefined }) {
  return <span class={`field-chevron${props.open === true ? " open" : ""}`}
    aria-hidden="true"><ChevronIcon /></span>;
}

export function SelectControl(props: { children: ComponentChildren }) {
  return <div class="select-control">{props.children}<FieldChevron /></div>;
}
