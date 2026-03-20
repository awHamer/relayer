import type { ComputedFieldDef } from '../fields/computed';
import type { DerivedFieldDef } from '../fields/derived';

export interface RelayerEntityStatics {
  readonly __relayer: true;
  readonly __computed: Map<string, ComputedFieldDef>;
  readonly __derived: Map<string, DerivedFieldDef>;
}

export type RelayerEntityClass = (new (...args: unknown[]) => unknown) & RelayerEntityStatics;

export function isRelayerEntityClass(value: unknown): value is RelayerEntityClass {
  return (
    typeof value === 'function' &&
    '__relayer' in value &&
    value.__relayer === true &&
    '__computed' in value &&
    '__derived' in value
  );
}
