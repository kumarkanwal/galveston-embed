interface IconProps {
  class?: string;
}

export function ClockIcon(props: IconProps) {
  return <svg class={props.class} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v5l3.5 2" />
  </svg>;
}

export function SeatIcon(props: IconProps) {
  return <svg class={props.class} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.5v8.25h9.5a2 2 0 0 1 2 2V19M5 19h14M7 10h7a2 2 0 0 1 2 2v.75" />
  </svg>;
}

export function PersonIcon(props: IconProps) {
  return <svg class={props.class} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="7.5" r="3" />
    <path d="M6.5 19c.4-4 2.2-6 5.5-6s5.1 2 5.5 6" />
  </svg>;
}

export function InfoIcon(props: IconProps) {
  return <svg class={props.class} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 10.5V17M12 7.25v.25" />
  </svg>;
}
