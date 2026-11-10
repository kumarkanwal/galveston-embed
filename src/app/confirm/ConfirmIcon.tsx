import type { JSX } from "preact";

type ConfirmIconName = "calendar" | "luggage" | "person" | "route" | "vehicle";

const paths: Record<ConfirmIconName, JSX.Element> = {
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 10h18" /></>,
  luggage: <><rect x="6" y="7" width="12" height="14" rx="2" />
    <path d="M9 7V4h6v3M9 11v6M15 11v6M4 11v6M20 11v6" /></>,
  person: <><circle cx="12" cy="7" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" /></>,
  route: <><path d="m17.8 19.2-4.3-7.7 5.2-5.2c1.4-1.4 1.8-3.2.9-4.1s-2.7-.5-4.1.9l-5.2 5.2-7.7-4.3L1 5.6l6 5.2-3 3-2.8-.4L.2 14.5l4.2 2.1 2.1 4.2 1.1-1.1-.4-2.8 3-3 5.2 6z" /></>,
  vehicle: <><path d="M5 17h14l-1.5-7h-11zM7 10l2-4h6l2 4" />
    <path d="M3 14v5h2M21 14v5h-2" /><circle cx="7" cy="17" r="1" />
    <circle cx="17" cy="17" r="1" /></>,
};

export function ConfirmIcon({ name }: { name: ConfirmIconName }) {
  return <svg class="confirm-icon" data-confirm-icon={name} aria-hidden="true"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round">
    {paths[name]}
  </svg>;
}
