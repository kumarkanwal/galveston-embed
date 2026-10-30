import type { ComponentChildren } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

export type ContainerLayout = "compact" | "full" | "medium" | "micro" | "narrow" | "wide";

export function containerLayout(width: number): ContainerLayout {
  if (width < 320) return "micro";
  if (width < 440) return "narrow";
  if (width < 740) return "compact";
  if (width <= 760) return "full";
  if (width <= 900) return "medium";
  return "wide";
}

export function ResponsiveRoot({ children }: { children: ComponentChildren }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<ContainerLayout>("wide");
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) return;
    const update = (width: number) => {
      if (width > 0) setLayout(containerLayout(width));
    };
    update(root.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry !== undefined) update(entry.contentRect.width);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  return <div class={`widget-root layout-${layout}`} ref={rootRef}>{children}</div>;
}
