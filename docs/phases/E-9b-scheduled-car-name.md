# E-9b — Scheduled shuttle car name

## Approved request

Refresh the public API contract from the supplied backend `origin/main`, which
includes backend B-38D commit `6b42887`. Scheduled shuttle departure cards show
`Departure.vehicle_type.name` when `vehicle_type` is non-null. They render no
empty vehicle row when it is null.

Keep `service_label` as the server-owned service description. Do not repurpose
it as a vehicle name, infer a vehicle from any display text, or change the
on-request vehicle-name path.

## Contract gate

Use only the regenerated `Departure` type. If the refreshed schema does not
publish nullable `vehicle_type` with a generated `name`, stop and report B-38D
as a backend gap.

## Documentation

Remove the E-9b / B-38D TODO from the E-9 spec, architecture and tracker. Mark
E-9b complete and add a tracker changelog entry.

## Tests

- A scheduled departure with a vehicle type shows its generated `name`.
- A scheduled departure with `vehicle_type: null` shows no empty vehicle row.
- The scheduled `service_label` and on-request `vehicle_type_name` behavior are
  unchanged.

