import { useEffect, useState } from "preact/hooks";

import type { ApiClient, Business, ServiceTypeOption } from "../../api/client";
import { NetworkError, UnauthorizedError } from "../../api/errors";
import { BookingFlow } from "./BookingFlow";

interface AppProps {
  client: ApiClient;
  mapsKey: string;
}

type ViewState =
  | { status: "loading" }
  | { status: "ready"; business: Business; services: ServiceTypeOption[] }
  | { status: "unauthorized" }
  | { status: "network-error" }
  | { status: "error" };

function failedState(error: unknown): ViewState {
  if (error instanceof UnauthorizedError) return { status: "unauthorized" };
  if (error instanceof NetworkError) return { status: "network-error" };
  return { status: "error" };
}

function messageFor(state: ViewState): string {
  if (state.status === "loading") return "Loading booking form…";
  if (state.status === "unauthorized") return "This booking form is not configured.";
  if (state.status === "network-error") {
    return "The booking form could not connect. Please try again.";
  }
  return "The booking form could not be loaded. Please try again.";
}

export function App({ client, mapsKey }: AppProps) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    Promise.all([client.getBusiness(), client.getServiceTypes()])
      .then(([business, services]) => {
        if (active) setState({ status: "ready", business, services });
      })
      .catch((error: unknown) => {
        if (active) setState(failedState(error));
      });
    return () => {
      active = false;
    };
  }, [client]);

  if (state.status === "ready") {
    return <BookingFlow business={state.business} services={state.services}
      client={client} mapsKey={mapsKey} />;
  }
  return <section class="widget status" aria-live="polite">{messageFor(state)}</section>;
}

