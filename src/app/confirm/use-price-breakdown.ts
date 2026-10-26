import { useEffect, useRef, useState } from "preact/hooks";

import type { ApiClient, PaymentMethod, TaxiPriceBreakdownResponse } from "../../api/client";
import type { TripFormState } from "../trip/types";
import { breakdownFailure } from "./breakdown-error";
import { buildBreakdownRequest } from "./build-requests";

export type BreakdownState =
  | { status: "skipped" }
  | { status: "loading" }
  | { status: "ready"; data: TaxiPriceBreakdownResponse }
  | { status: "error"; field: "carSeats" | "promoCode" | null; message: string };

export interface PromoCodeState {
  appliedCode: string | null;
  error: string | undefined;
  input: string;
  status: "idle" | "applying" | "applied" | "removing";
}

export interface PriceBreakdownController {
  applyPromo: () => Promise<void>;
  busy: boolean;
  promo: PromoCodeState;
  removePromo: () => Promise<void>;
  setPromoInput: (value: string) => void;
  state: BreakdownState;
}

type Setter<T> = (value: T | ((current: T) => T)) => void;

interface PricingInput {
  carSeats: number;
  client: ApiClient;
  form: TripFormState;
  paymentMethod: PaymentMethod;
  vehicleTypeId: string;
}

interface PricingRuntime {
  appliedCode: { current: string | null };
  latestRequest: { current: number };
  setPromo: Setter<PromoCodeState>;
  setState: Setter<BreakdownState>;
}

function price(input: PricingInput, promoCode: string | null) {
  return input.client.priceBreakdown(buildBreakdownRequest(
    input.form, input.vehicleTypeId, input.carSeats, promoCode, input.paymentMethod,
  ));
}

function initialPromo(): PromoCodeState {
  return { appliedCode: null, error: undefined, input: "", status: "idle" };
}

function useAutomaticPrice(input: PricingInput, enabled: boolean, runtime: PricingRuntime) {
  useEffect(() => {
    if (!enabled) {
      runtime.setState({ status: "skipped" });
      return;
    }
    const requestId = runtime.latestRequest.current + 1;
    runtime.latestRequest.current = requestId;
    runtime.setState({ status: "loading" });
    runtime.setPromo((current) => ({
      ...current,
      error: undefined,
      status: runtime.appliedCode.current === null ? "idle" : "applied",
    }));
    price(input, runtime.appliedCode.current).then((data) => {
      if (runtime.latestRequest.current === requestId) {
        runtime.setState({ status: "ready", data });
      }
    }).catch((error: unknown) => {
      if (runtime.latestRequest.current !== requestId) return;
      const failure = breakdownFailure(error);
      runtime.setState({ status: "error", ...failure });
      if (failure.field === "promoCode") {
        runtime.setPromo((current) => ({ ...current, error: failure.message }));
      }
    });
  }, [input.carSeats, input.client, enabled, input.form, input.paymentMethod, input.vehicleTypeId]);
}

async function applyPromoCode(
  input: PricingInput,
  state: BreakdownState,
  promo: PromoCodeState,
  runtime: PricingRuntime,
) {
  if (promo.status !== "idle" || promo.input.trim() === "" || state.status !== "ready") return;
  const requestId = runtime.latestRequest.current + 1;
  runtime.latestRequest.current = requestId;
  runtime.setPromo((current) => ({ ...current, error: undefined, status: "applying" }));
  try {
    const data = await price(input, promo.input);
    if (runtime.latestRequest.current !== requestId) return;
    runtime.appliedCode.current = promo.input;
    runtime.setState({ status: "ready", data });
    runtime.setPromo((current) => ({
      ...current, appliedCode: current.input, status: "applied",
    }));
  } catch (error: unknown) {
    if (runtime.latestRequest.current !== requestId) return;
    const failure = breakdownFailure(error);
    if (failure.field === "promoCode") {
      runtime.setPromo((current) => ({ ...current, error: failure.message, status: "idle" }));
      return;
    }
    runtime.setState({ status: "error", ...failure });
    runtime.setPromo((current) => ({ ...current, status: "idle" }));
  }
}

async function removePromoCode(
  input: PricingInput,
  promo: PromoCodeState,
  runtime: PricingRuntime,
) {
  if (promo.status !== "applied") return;
  const requestId = runtime.latestRequest.current + 1;
  runtime.latestRequest.current = requestId;
  runtime.setPromo((current) => ({ ...current, error: undefined, status: "removing" }));
  try {
    const data = await price(input, null);
    if (runtime.latestRequest.current !== requestId) return;
    runtime.appliedCode.current = null;
    runtime.setState({ status: "ready", data });
    runtime.setPromo(initialPromo());
  } catch (error: unknown) {
    if (runtime.latestRequest.current !== requestId) return;
    runtime.setState({ status: "error", ...breakdownFailure(error) });
    runtime.setPromo((current) => ({ ...current, status: "applied" }));
  }
}

export function usePriceBreakdown(
  client: ApiClient,
  form: TripFormState,
  vehicleTypeId: string,
  carSeats: number,
  enabled = true,
  paymentMethod: PaymentMethod = "cash",
): PriceBreakdownController {
  const [state, setState] = useState<BreakdownState>(
    enabled ? { status: "loading" } : { status: "skipped" },
  );
  const [promo, setPromo] = useState<PromoCodeState>(initialPromo);
  const runtime = {
    appliedCode: useRef<string | null>(null),
    latestRequest: useRef(0),
    setPromo,
    setState,
  };
  const input = { carSeats, client, form, paymentMethod, vehicleTypeId };
  useAutomaticPrice(input, enabled, runtime);
  const setPromoInput = (value: string) => {
    if (promo.status === "idle") {
      setPromo((current) => ({ ...current, error: undefined, input: value }));
    }
  };
  return {
    applyPromo: () => applyPromoCode(input, state, promo, runtime),
    busy: promo.status === "applying" || promo.status === "removing",
    promo,
    removePromo: () => removePromoCode(input, promo, runtime),
    setPromoInput,
    state,
  };
}
