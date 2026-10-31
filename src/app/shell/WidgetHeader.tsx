import type { Ref } from "preact";

interface WidgetHeaderProps {
  businessName?: string | undefined;
  headingRef?: Ref<HTMLHeadingElement> | undefined;
  logoUrl?: string | null | undefined;
  subtitle: string;
}

export function WidgetHeader(props: WidgetHeaderProps) {
  return <header class="widget-heading">
    {props.logoUrl != null && props.logoUrl !== "" && <img class="business-logo"
      src={props.logoUrl} alt={props.businessName ?? "Business"} />}
    <div><h1 ref={props.headingRef ?? null} tabIndex={-1}>Reservations</h1><p>{props.subtitle}</p></div>
  </header>;
}
