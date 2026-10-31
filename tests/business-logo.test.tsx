import { render } from "preact";
import { describe, expect, it } from "vitest";

import { WidgetHeader } from "../src/app/shell/WidgetHeader";

function renderHeader(logoUrl?: string | null): HTMLElement {
  const element = document.createElement("div");
  render(<WidgetHeader businessName="Island Shuttle" logoUrl={logoUrl}
    subtitle="Book your trip." />, element);
  return element;
}

describe("business logo", () => {
  it("shows the public logo with the business name as alt text", () => {
    const logo = renderHeader("https://cdn.example.com/logo.png")
      .querySelector<HTMLImageElement>(".business-logo");
    expect(logo?.src).toBe("https://cdn.example.com/logo.png");
    expect(logo?.alt).toBe("Island Shuttle");
  });

  it.each([undefined, null, ""])("shows no logo for %s", (logoUrl) => {
    expect(renderHeader(logoUrl).querySelector(".business-logo")).toBeNull();
  });
});
