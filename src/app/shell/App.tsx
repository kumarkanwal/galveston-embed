import { useEffect, useState } from "preact/hooks";

import type { Business } from "../../api/client";
import { NetworkError, UnauthorizedError } from "../../api/errors";

export interface BusinessClient {
  getBusiness(): Promise<Business>;
}

interface AppProps {
  client: BusinessClient;
}

type ViewState =
  | { status: "loading" }
  | { status: "ready"; business: Business }
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

export function App({ client }: AppProps) {
  const [state, setState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    client
      .getBusiness()
      .then((business) => {
        if (active) setState({ status: "ready", business });
      })
      .catch((error: unknown) => {
        if (active) setState(failedState(error));
      });
    return () => {
      active = false;
    };
  }, [client]);

  if (state.status === "ready") {
    return <section class="widget" aria-live="polite"><h1>{state.business.name}</h1></section>;
  }
  return <section class="widget status" aria-live="polite">{messageFor(state)}</section>;
}

