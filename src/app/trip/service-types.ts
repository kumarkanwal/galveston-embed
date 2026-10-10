import type { ServiceTypeOption } from "../../api/service-types";
import {
  CORE_SERVICE_CODES,
  type CoreService,
  type CoreServiceCode,
} from "./types";

function isCoreCode(code: string): code is CoreServiceCode {
  return CORE_SERVICE_CODES.some((allowed) => allowed === code);
}

export function filterCoreServices(services: ServiceTypeOption[]): CoreService[] {
  return services.filter(
    (service): service is CoreService => isCoreCode(service.code),
  );
}
