import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapPanel } from "../src/app/trip/MapPanel";
import {
  loadGoogleMaps,
  resetGoogleMapsLoaderForTests,
} from "../src/maps/google-maps-loader";
import { replaceRoute, type RouteLibraries } from "../src/maps/route";

beforeEach(() => {
  document.head.querySelectorAll("script[src^='https://maps.googleapis.com/maps/api/js']")
    .forEach((script) => script.remove());
  resetGoogleMapsLoaderForTests();
});

describe("Google Maps failure", () => {
  it("does not insert a script when the key is missing", async () => {
    await expect(loadGoogleMaps("")).rejects.toThrow("key is missing");
    expect(document.head.querySelector("script[src*='maps.googleapis.com']")).toBeNull();
  });

  it("keeps a usable widget notice when the map cannot load", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    render(<MapPanel mapsKey="" pickup={null} dropoff={null} routePolyline={null} />, root);
    await vi.waitFor(() => expect(root.textContent).toContain("address lookup are unavailable"));
    expect(root.querySelector(".map-canvas")).toBeNull();
  });
});

describe("route rendering", () => {
  it("decodes and draws an encoded route", () => {
    const path = [{} as google.maps.LatLng, {} as google.maps.LatLng];
    const decodePath = vi.fn(() => path);
    const Polyline = vi.fn(class {
      setMap = vi.fn();
    });
    const libraries = {
      geometry: { encoding: { decodePath } },
      maps: { Polyline },
    } as unknown as RouteLibraries;
    const result = replaceRoute(libraries, {} as google.maps.Map, null, "encoded-route");
    expect(decodePath).toHaveBeenCalledWith("encoded-route");
    expect(Polyline).toHaveBeenCalledOnce();
    expect(result.path).toBe(path);
    expect(result.polyline).not.toBeNull();
  });

  it("clears an old route and does not decode a null route", () => {
    const current = { setMap: vi.fn() } as unknown as google.maps.Polyline;
    const decodePath = vi.fn();
    const libraries = {
      geometry: { encoding: { decodePath } },
      maps: { Polyline: vi.fn() },
    } as unknown as RouteLibraries;
    expect(replaceRoute(libraries, {} as google.maps.Map, current, null)).toEqual({
      path: [],
      polyline: null,
    });
    expect(current.setMap).toHaveBeenCalledWith(null);
    expect(decodePath).not.toHaveBeenCalled();
  });
});
