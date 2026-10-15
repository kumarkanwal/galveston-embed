import type { MapPoint } from "../app/trip/types";

export interface PreviewRoute {
  path: google.maps.LatLngLiteral[];
  polylines: google.maps.Polyline[];
}

export interface ComputedRoute {
  createPolylines(options: {
    polylineOptions: google.maps.PolylineOptions;
  }): google.maps.Polyline[];
  path?: Array<{ lat: number; lng: number }>;
}

export interface RoutePreviewLibrary {
  Route: {
    computeRoutes(request: {
      destination: MapPoint;
      fields: string[];
      origin: MapPoint;
      travelMode: "DRIVING";
    }): Promise<{ routes?: ComputedRoute[] }>;
  };
}

export async function requestPreviewRoute(
  library: RoutePreviewLibrary,
  pickup: MapPoint,
  dropoff: MapPoint,
): Promise<PreviewRoute | null> {
  const response = await library.Route.computeRoutes({
    destination: dropoff,
    fields: ["path"],
    origin: pickup,
    travelMode: "DRIVING",
  });
  const route = response.routes?.[0];
  const path = route?.path?.map((point) => ({ lat: point.lat, lng: point.lng })) ?? [];
  if (route === undefined || path.length === 0) return null;
  const polylines = route.createPolylines({
    polylineOptions: {
      strokeColor: "#d9534f",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    },
  });
  return { path, polylines };
}
