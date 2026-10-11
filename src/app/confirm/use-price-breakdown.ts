import { useEffect, useRef, useState } from "preact/hooks";

import type { ApiClient, TaxiPriceBreakdownResponse } from "../../api/client";
import type { TripFormState } from "../trip/types";
import { breakdownErrorMessage } from "./breakdown-error";
import { buildBreakdownRequest } from "./build-requests";

export type BreakdownState =
  | { status: "skipped" }
  | { status: "loading" }
  | { status: "ready"; data: TaxiPriceBreakdownResponse }
  | { status: "error"; message: string };

export function usePriceBreakdown(
  client: ApiClient,
  form: TripFormState,
  vehicleTypeId: string,
  carSeats: number,
  enabled = true,
): BreakdownState {
  const [state, setState] = useState<BreakdownState>(
    enabled ? { status: "loading" } : { status: "skipped" },
  );
  const latestRequest = useRef(0);
  useEffect(() => {
    if (!enabled) {
      setState({ status: "skipped" });
      return;
    }
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setState({ status: "loading" });
    client.priceBreakdown(buildBreakdownRequest(form, vehicleTypeId, carSeats))
      .then((data) => {
        if (latestRequest.current === requestId) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (latestRequest.current === requestId) {
          setState({ status: "error", message: breakdownErrorMessage(error) });
        }
      });
  }, [carSeats, client, enabled, form, vehicleTypeId]);
  return state;
}
