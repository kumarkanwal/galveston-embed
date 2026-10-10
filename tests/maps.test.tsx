import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MapPanel } from "../src/app/trip/MapPanel";
import {
  loadGoogleMaps,
  resetGoogleMapsLoaderForTests,
} from "../src/maps/google-maps-loader";

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
    render(<MapPanel mapsKey="" pickup={null} dropoff={null} />, root);
    await vi.waitFor(() => expect(root.textContent).toContain("address lookup are unavailable"));
    expect(root.querySelector(".map-canvas")).toBeNull();
  });
});
