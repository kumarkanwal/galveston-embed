import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MapPanel } from "../src/app/trip/MapPanel";
import { resetGoogleMapsLoaderForTests } from "../src/maps/google-maps-loader";
import type { ComputedRoute } from "../src/maps/preview-route";

const PICKUP = { lat: 29.307, lng: -94.7977 };
const DROPOFF = { lat: 29.7604, lng: -95.3698 };
const CHANGED_DROPOFF = { lat: 29.9902, lng: -95.3368 };

function polyline(): google.maps.Polyline {
  return { setMap: vi.fn() } as unknown as google.maps.Polyline;
}

function route(path: google.maps.LatLngLiteral[], line = polyline()): ComputedRoute {
  return { createPolylines: vi.fn(() => [line]), path };
}

function setupGoogle(computeRoutes: ReturnType<typeof vi.fn>) {
  const map = {
    fitBounds: vi.fn(),
    setCenter: vi.fn(),
    setZoom: vi.fn(),
  } as unknown as google.maps.Map;
  const Map = vi.fn(function MapConstructor() { return map; });
  const Marker = vi.fn(class { setMap = vi.fn(); });
  const libraries = {
    geometry: { encoding: { decodePath: vi.fn() } },
    maps: { Map, Polyline: vi.fn() },
    marker: { Marker },
    routes: { Route: { computeRoutes } },
  };
  const importLibrary = vi.fn(async (name: keyof typeof libraries) => libraries[name]);
  vi.stubGlobal("google", { maps: {
    importLibrary,
    LatLngBounds: class { extend = vi.fn(); },
  } });
  return map;
}

function mount(pickup = PICKUP, dropoff = DROPOFF) {
  const root = document.createElement("div");
  render(<MapPanel mapsKey="maps-key" pickup={pickup} dropoff={dropoff}
    routePolyline={null} />, root);
  return root;
}

beforeEach(() => resetGoogleMapsLoaderForTests());
afterEach(() => vi.unstubAllGlobals());

describe("step-one route preview", () => {
  it.each([
    ["address to address", PICKUP, DROPOFF],
    ["airport to address", CHANGED_DROPOFF, DROPOFF],
  ])("requests and draws a driving route for %s", async (_label, pickup, dropoff) => {
    const line = polyline();
    const computeRoutes = vi.fn(async () => ({ routes: [route([pickup, dropoff], line)] }));
    const map = setupGoogle(computeRoutes);
    mount(pickup, dropoff);
    await vi.waitFor(() => expect(line.setMap).toHaveBeenCalledWith(map));
    expect(computeRoutes).toHaveBeenCalledWith({
      destination: dropoff,
      fields: ["path"],
      origin: pickup,
      travelMode: "DRIVING",
    });
  });

  it("updates the route when either endpoint changes", async () => {
    const firstLine = polyline();
    const secondLine = polyline();
    const computeRoutes = vi.fn()
      .mockResolvedValueOnce({ routes: [route([PICKUP, DROPOFF], firstLine)] })
      .mockResolvedValueOnce({ routes: [route([PICKUP, CHANGED_DROPOFF], secondLine)] });
    const map = setupGoogle(computeRoutes);
    const root = mount();
    await vi.waitFor(() => expect(firstLine.setMap).toHaveBeenCalledWith(map));
    render(<MapPanel mapsKey="maps-key" pickup={PICKUP} dropoff={CHANGED_DROPOFF}
      routePolyline={null} />, root);
    await vi.waitFor(() => expect(secondLine.setMap).toHaveBeenCalledWith(map));
    expect(firstLine.setMap).toHaveBeenCalledWith(null);
    expect(computeRoutes).toHaveBeenCalledTimes(2);
  });

});

describe("step-one route preview resilience", () => {

  it("ignores a stale route response", async () => {
    const resolvers: Array<(value: { routes: ComputedRoute[] }) => void> = [];
    const computeRoutes = vi.fn(() => new Promise<{ routes: ComputedRoute[] }>(
      (resolve) => resolvers.push(resolve),
    ));
    const map = setupGoogle(computeRoutes);
    const root = mount();
    await vi.waitFor(() => expect(computeRoutes).toHaveBeenCalledOnce());
    render(<MapPanel mapsKey="maps-key" pickup={PICKUP} dropoff={CHANGED_DROPOFF}
      routePolyline={null} />, root);
    await vi.waitFor(() => expect(computeRoutes).toHaveBeenCalledTimes(2));
    const oldLine = polyline();
    const currentLine = polyline();
    resolvers[1]?.({ routes: [route([PICKUP, CHANGED_DROPOFF], currentLine)] });
    await vi.waitFor(() => expect(currentLine.setMap).toHaveBeenCalledWith(map));
    resolvers[0]?.({ routes: [route([PICKUP, DROPOFF], oldLine)] });
    await Promise.resolve();
    expect(oldLine.setMap).not.toHaveBeenCalled();
  });

  it("keeps the map usable when route preview fails", async () => {
    const computeRoutes = vi.fn(async () => Promise.reject(new Error("Routes unavailable")));
    setupGoogle(computeRoutes);
    const root = mount();
    await vi.waitFor(() => expect(computeRoutes).toHaveBeenCalledOnce());
    expect(root.querySelector(".map-canvas")).not.toBeNull();
    expect(root.textContent).not.toContain("unavailable");
  });
});
