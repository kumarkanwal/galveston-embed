import { useEffect, useState } from "preact/hooks";

import type { ApiClient } from "../../api/client";
import type { AirportData, CoreServiceCode } from "./types";

type AirportDataState =
  | { status: "idle" | "loading" }
  | { status: "ready"; data: AirportData }
  | { status: "error" };

export function useAirportData(client: ApiClient, service: CoreServiceCode) {
  const [state, setState] = useState<AirportDataState>({ status: "idle" });
  const needsAirportData = service !== "one_way";
  useEffect(() => {
    if (!needsAirportData) {
      setState({ status: "idle" });
      return;
    }
    let active = true;
    setState({ status: "loading" });
    void Promise.all([client.getAirports(), client.getAirlines()])
      .then(([airports, airlines]) => {
        if (active) setState({ status: "ready", data: { airports, airlines } });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, [client, needsAirportData]);
  return state;
}
