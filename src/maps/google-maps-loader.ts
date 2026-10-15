import type { RoutePreviewLibrary } from "./preview-route";

const MAPS_SCRIPT_PREFIX = "https://maps.googleapis.com/maps/api/js";
const CALLBACK_NAME = "__galvestonMapsReady";

type MapsWindow = Window & {
  google?: typeof google;
  __galvestonMapsReady?: () => void;
};

let loadPromise: Promise<typeof google> | undefined;

function loadedApi(): typeof google | undefined {
  const mapsWindow = window as MapsWindow;
  return mapsWindow.google?.maps?.importLibrary === undefined
    ? undefined
    : mapsWindow.google;
}

function awaitExistingScript(script: HTMLScriptElement): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      const api = loadedApi();
      if (api === undefined) reject(new Error("Google Maps did not initialize."));
      else resolve(api);
    };
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Google Maps could not be loaded.")),
      { once: true },
    );
  });
}

function insertScript(key: string): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    const mapsWindow = window as MapsWindow;
    const script = document.createElement("script");
    const parameters = new URLSearchParams({
      key,
      loading: "async",
      v: "weekly",
      callback: CALLBACK_NAME,
    });
    mapsWindow.__galvestonMapsReady = () => {
      delete mapsWindow.__galvestonMapsReady;
      const api = loadedApi();
      if (api === undefined) reject(new Error("Google Maps did not initialize."));
      else resolve(api);
    };
    script.src = `${MAPS_SCRIPT_PREFIX}?${parameters.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps could not be loaded."));
    document.head.append(script);
  });
}

export function loadGoogleMaps(key: string): Promise<typeof google> {
  const api = loadedApi();
  if (api !== undefined) return Promise.resolve(api);
  if (loadPromise !== undefined) return loadPromise;
  if (key.trim() === "") return Promise.reject(new Error("Google Maps key is missing."));
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src^="${MAPS_SCRIPT_PREFIX}"]`,
  );
  loadPromise = existing === null ? insertScript(key) : awaitExistingScript(existing);
  return loadPromise;
}

export async function loadPlacesLibrary(
  key: string,
): Promise<google.maps.PlacesLibrary> {
  const api = await loadGoogleMaps(key);
  return api.maps.importLibrary("places") as Promise<google.maps.PlacesLibrary>;
}

export async function loadRouteLibrary(
  key: string,
): Promise<RoutePreviewLibrary> {
  const api = await loadGoogleMaps(key);
  return api.maps.importLibrary("routes") as unknown as Promise<RoutePreviewLibrary>;
}

export async function loadMapLibraries(key: string): Promise<{
  geometry: google.maps.GeometryLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
}> {
  const api = await loadGoogleMaps(key);
  const [geometry, maps, marker] = await Promise.all([
    api.maps.importLibrary("geometry") as Promise<google.maps.GeometryLibrary>,
    api.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
    api.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
  ]);
  return { geometry, maps, marker };
}

export function resetGoogleMapsLoaderForTests(): void {
  loadPromise = undefined;
}
