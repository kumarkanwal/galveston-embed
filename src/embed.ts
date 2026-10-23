import { h, render } from "preact";

import { App } from "./app/shell/App";
import { createApiClient, type ApiClient } from "./api/client";
import confirmStyles from "./styles/confirm.css?inline";
import vehicleStyles from "./styles/vehicle.css?inline";
import widgetStyles from "./styles/widget.css?inline";
import shuttleStyles from "./styles/shuttle.css?inline";

const MOUNT_ID = "galveston-booking";

export interface EmbedConfig {
  apiBase: string;
  businessKey: string;
}

type ClientFactory = (config: EmbedConfig) => ApiClient;

function defaultClientFactory(config: EmbedConfig): ApiClient {
  return createApiClient(config);
}

function fallbackDevelopmentScript(documentRoot: Document): HTMLScriptElement | null {
  if (!import.meta.env.DEV) return null;
  return documentRoot.querySelector<HTMLScriptElement>("script[data-galveston-dev]");
}

export function captureScriptConfig(
  currentScript: HTMLScriptElement | null,
): EmbedConfig {
  return {
    businessKey: currentScript?.dataset.businessKey ?? "",
    apiBase: currentScript?.dataset.apiBase ?? import.meta.env.VITE_API_BASE ?? "",
  };
}

function reportMountError(): void {
  console.error("Galveston booking widget could not mount.");
}

export function mountBookingWidget(
  config: EmbedConfig,
  documentRoot: Document = document,
  createClient: ClientFactory = defaultClientFactory,
): void {
  try {
    const mountElement = documentRoot.getElementById(MOUNT_ID);
    if (mountElement === null) {
      reportMountError();
      return;
    }
    if (mountElement.shadowRoot !== null) return;

    const shadowRoot = mountElement.attachShadow({ mode: "open" });
    const style = documentRoot.createElement("style");
    const appRoot = documentRoot.createElement("div");
    style.textContent = `${widgetStyles}\n${vehicleStyles}\n${confirmStyles}\n${shuttleStyles}`;
    shadowRoot.append(style, appRoot);
    render(h(App, {
      client: createClient(config),
      mapsKey: import.meta.env.VITE_MAPS_BROWSER_KEY ?? "",
    }), appRoot);
  } catch {
    reportMountError();
  }
}

export function runEmbed(documentRoot: Document = document): void {
  const script = documentRoot.currentScript as HTMLScriptElement | null;
  const capturedScript = script ?? fallbackDevelopmentScript(documentRoot);
  mountBookingWidget(captureScriptConfig(capturedScript), documentRoot);
}

if (!import.meta.env.TEST) runEmbed();

