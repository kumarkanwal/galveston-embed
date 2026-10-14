import { useEffect, useState } from "preact/hooks";

import type { Airport } from "../../api/client";
import { resolveAirportLocation } from "../../maps/airport-location";
import type { MapPoint } from "./types";

type AirportLocationStatus = "idle" | "loading" | "ready" | "error";

export function useAirportLocation(
  airport: Airport | undefined,
  mapsKey: string,
  onLocation: (location: MapPoint | null) => void,
): AirportLocationStatus {
  const [status, setStatus] = useState<AirportLocationStatus>("idle");

  useEffect(() => {
    let active = true;
    if (airport === undefined) {
      setStatus("idle");
      return () => { active = false; };
    }
    setStatus("loading");
    void resolveAirportLocation(airport, mapsKey).then((location) => {
      if (!active) return;
      onLocation(location);
      setStatus(location === null ? "error" : "ready");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [airport?.id, mapsKey]);

  return status;
}
