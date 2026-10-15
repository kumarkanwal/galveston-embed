import { useEffect, useRef, useState } from "preact/hooks";

import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from "../../maps/config";
import { loadMapLibraries, loadRouteLibrary } from "../../maps/google-maps-loader";
import { requestPreviewRoute } from "../../maps/preview-route";
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

type MapState =
  | { status: "loading" | "error" }
  | { api: MapApi; map: google.maps.Map; status: "ready" };

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
  routePath: Array<google.maps.LatLng | google.maps.LatLngLiteral>,
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

function clearPolylines(polylines: google.maps.Polyline[]): void {
  polylines.forEach((polyline) => polyline.setMap(null));
}

function useMapInstance(container: { current: HTMLDivElement | null }, mapsKey: string): MapState {
  const [state, setState] = useState<MapState>({ status: "loading" });
  useEffect(() => {
    let active = true;
    if (container.current === null) return;
    void loadMapLibraries(mapsKey).then((api) => {
      if (!active || container.current === null) return;
      const map = new api.maps.Map(container.current, {
        center: DEFAULT_MAP_CENTER,
        zoom: DEFAULT_MAP_ZOOM,
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
      });
      setState({ api, map, status: "ready" });
    }).catch(() => {
      if (active) setState({ status: "error" });
    });
    return () => { active = false; };
  }, [container, mapsKey]);
  return state;
}

function useMapContents(state: MapState, props: MapPanelProps): void {
  const markers = useRef<google.maps.Marker[]>([]);
  const route = useRef<google.maps.Polyline[]>([]);
  const routeRequest = useRef(0);

  useEffect(() => {
    if (state.status !== "ready") return;
    const requestId = ++routeRequest.current;
    const points = [
      ...(props.pickup === null ? [] : [{ label: "A", point: props.pickup }]),
      ...(props.dropoff === null ? [] : [{ label: "B", point: props.dropoff }]),
    ];
    markers.current = replaceMarkers(state.api, state.map, markers.current, points);
    clearPolylines(route.current);
    route.current = [];
    if (props.routePolyline !== null) {
      const drawn = replaceRoute(state.api, state.map, null, props.routePolyline);
      route.current = drawn.polyline === null ? [] : [drawn.polyline];
      positionMap(state.api, state.map, points, drawn.path);
      return;
    }
    positionMap(state.api, state.map, points, []);
    const pickup = props.pickup;
    const dropoff = props.dropoff;
    if (pickup === null || dropoff === null) return;
    void loadRouteLibrary(props.mapsKey)
      .then((library) => requestPreviewRoute(library, pickup, dropoff))
      .then((preview) => {
        if (preview === null || routeRequest.current !== requestId) return;
        preview.polylines.forEach((polyline) => polyline.setMap(state.map));
        route.current = preview.polylines;
        positionMap(state.api, state.map, points, preview.path);
      })
      .catch(() => undefined);
  }, [props.dropoff, props.mapsKey, props.pickup, props.routePolyline, state]);
}

export function MapPanel(props: MapPanelProps) {
  const container = useRef<HTMLDivElement>(null);
  const state = useMapInstance(container, props.mapsKey);
  useMapContents(state, props);

  if (state.status === "error") {
    return <div class="map-unavailable" role="status">
      Map and address lookup are unavailable. Please try again later.
    </div>;
  }
  return <div class="map-panel" aria-label="Trip map">
    <div class="map-canvas" ref={container} />
    {state.status === "loading" && <div class="map-loading">Loading map…</div>}
  </div>;
}
