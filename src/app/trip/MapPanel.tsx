import { useEffect, useRef, useState } from "preact/hooks";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../../maps/config";
import { loadMapLibraries } from "../../maps/google-maps-loader";
import { replaceRoute, type RouteLibraries } from "../../maps/route";
import type { MapPoint } from "./types";

interface MapPanelProps {
  dropoff: MapPoint | null;
  mapsKey: string;
  pickup: MapPoint | null;
  routePolyline: string | null;
}

interface MapApi extends RouteLibraries {
  marker: google.maps.MarkerLibrary;
}

function replaceMarkers(
  api: MapApi,
  map: google.maps.Map,
  oldMarkers: google.maps.Marker[],
  points: Array<{ label: string; point: MapPoint }>,
): google.maps.Marker[] {
  oldMarkers.forEach((marker) => marker.setMap(null));
  return points.map(({ label, point }) => new api.marker.Marker({
    label,
    map,
    position: point,
  }));
}

export function positionMap(
  api: MapApi,
  map: google.maps.Map,
  points: Array<{ label: string; point: MapPoint }>,
  routePath: google.maps.LatLng[],
): void {
  if (routePath.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    routePath.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 56);
    return;
  }
  if (points.length === 0) return;
  const firstPoint = points[0];
  if (points.length === 1 && firstPoint !== undefined) {
    map.setCenter(firstPoint.point);
    map.setZoom(12);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  points.forEach(({ point }) => bounds.extend(point));
  map.fitBounds(bounds, 56);
}

export function MapPanel({ dropoff, mapsKey, pickup, routePolyline }: MapPanelProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const api = useRef<MapApi | null>(null);
  const markers = useRef<google.maps.Marker[]>([]);
  const route = useRef<google.maps.Polyline | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    if (container.current === null) return;
    void loadMapLibraries(mapsKey).then((libraries) => {
      if (!active || container.current === null) return;
      api.current = libraries;
      map.current = new libraries.maps.Map(container.current, {
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });
      setStatus("ready");
    }).catch(() => {
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [mapsKey]);

  useEffect(() => {
    if (status !== "ready" || api.current === null || map.current === null) return;
    const points = [
      ...(pickup === null ? [] : [{ label: "A", point: pickup }]),
      ...(dropoff === null ? [] : [{ label: "B", point: dropoff }]),
    ];
    markers.current = replaceMarkers(api.current, map.current, markers.current, points);
    const drawn = replaceRoute(api.current, map.current, route.current, routePolyline);
    route.current = drawn.polyline;
    positionMap(api.current, map.current, points, drawn.path);
  }, [dropoff, pickup, routePolyline, status]);

  if (status === "error") {
    return <div class="map-unavailable" role="status">
      Map and address lookup are unavailable. Please try again later.
    </div>;
  }
  return <div class="map-panel" aria-label="Trip map">
    <div class="map-canvas" ref={container} />
    {status === "loading" && <div class="map-loading">Loading map…</div>}
  </div>;
}
