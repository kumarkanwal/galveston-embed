import { render } from "preact";
import { act } from "preact/test-utils";
import { expect, it, vi } from "vitest";

import { ConfirmForm } from "../src/app/confirm/ConfirmForm";

it("uses SVG contact icons and toggles Terms from the whole text label", () => {
  const root = document.createElement("div");
  render(<ConfirmForm breakdownReady buttonLabel="Create Trip" failure={null}
    isSubmitting={false} onChange={vi.fn()} onValid={vi.fn()}
    terms="Please arrive early." />, root);
  expect([...root.querySelectorAll(".input-with-icon svg")]
    .map((icon) => icon.getAttribute("data-confirm-icon"))).toEqual(["phone", "email"]);
  expect(root.querySelectorAll(".input-with-icon svg[aria-hidden='true']")).toHaveLength(2);
  expect(root.querySelector(".input-with-icon")?.textContent).not.toMatch(/[☎@]/);
  const checkbox = root.querySelector<HTMLInputElement>("#accepted-terms");
  const label = root.querySelector<HTMLLabelElement>('label[for="accepted-terms"]');
  expect(checkbox?.checked).toBe(false);
  act(() => label?.click());
  expect(checkbox?.checked).toBe(true);
});
