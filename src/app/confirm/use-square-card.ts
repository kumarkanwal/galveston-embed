import { useCallback, useEffect, useRef, useState } from "preact/hooks";

import type { BusinessPayments } from "../../api/client";
import {
  CardTokenizationError,
  loadSquareSdk,
  SQUARE_CARD_CONTAINER_ID,
  type SquareCard,
} from "./square-sdk";

export type SquareCardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready" }
  | { status: "error"; message: string };

async function destroyCard(card: SquareCard | null): Promise<void> {
  if (card?.destroy !== undefined) await card.destroy();
}

async function createCard(settings: BusinessPayments): Promise<SquareCard> {
  const square = await loadSquareSdk(settings.environment);
  const payments = square.payments(settings.square_application_id, settings.square_location_id);
  const card = await payments.card();
  await card.attach(`#${SQUARE_CARD_CONTAINER_ID}`);
  return card;
}

export function useSquareCard(
  enabled: boolean,
  settings: BusinessPayments | null,
) {
  const cardRef = useRef<SquareCard | null>(null);
  const [state, setState] = useState<SquareCardState>({ status: "idle" });
  useEffect(() => {
    if (!enabled || settings === null) {
      setState({ status: "idle" });
      return;
    }
    let active = true;
    setState({ status: "loading" });
    createCard(settings).then(async (card) => {
      if (!active) await destroyCard(card);
      else { cardRef.current = card; setState({ status: "ready" }); }
    }).catch(() => {
      if (active) setState({ status: "error",
        message: "Card payment is temporarily unavailable. Choose Cash or try again later." });
    });
    return () => {
      active = false;
      const card = cardRef.current;
      cardRef.current = null;
      void destroyCard(card);
    };
  }, [enabled, settings]);
  const tokenize = useCallback(async () => {
    const card = cardRef.current;
    if (card === null) throw new CardTokenizationError();
    try {
      const result = await card.tokenize();
      if (result.status === "OK" && typeof result.token === "string" && result.token !== "") {
        return result.token;
      }
    } catch { /* Replace provider details with a stable customer-safe message. */ }
    throw new CardTokenizationError();
  }, []);
  return { ready: state.status === "ready", state, tokenize };
}
