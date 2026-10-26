import { SQUARE_CARD_SLOT } from "./square-sdk";
import type { SquareCardState } from "./use-square-card";

export function SquareCardField({ state }: { state: SquareCardState }) {
  return <div class="square-card-field">
    <span class="square-card-label">Card details</span>
    <div class="square-card-frame">
      <slot name={SQUARE_CARD_SLOT} />
    </div>
    {state.status === "loading" && <p class="square-card-status" role="status">
      Loading secure card fields…
    </p>}
    {state.status === "error" && <p class="field-error" role="alert">{state.message}</p>}
  </div>;
}
