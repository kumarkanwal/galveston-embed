import type { SelectedAddress } from "../trip/types";

export function addressAfterRouteChange(
  address: SelectedAddress | null,
  previousRoute: string,
  nextRoute: string,
): SelectedAddress | null {
  return previousRoute === nextRoute ? address : null;
}
