export interface RouteLibraries {
  geometry: google.maps.GeometryLibrary;
  maps: google.maps.MapsLibrary;
}

export interface DrawnRoute {
  path: google.maps.LatLng[];
  polyline: google.maps.Polyline | null;
}

export function replaceRoute(
  libraries: RouteLibraries,
  map: google.maps.Map,
  current: google.maps.Polyline | null,
  encoded: string | null,
): DrawnRoute {
  current?.setMap(null);
  if (encoded === null || encoded === "") return { path: [], polyline: null };
  try {
    const path = libraries.geometry.encoding.decodePath(encoded);
    if (path.length === 0) return { path, polyline: null };
    const polyline = new libraries.maps.Polyline({
      map,
      path,
      strokeColor: "#d9534f",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    return { path, polyline };
  } catch {
    return { path: [], polyline: null };
  }
}
