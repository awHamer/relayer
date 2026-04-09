import type { GqlScalarKind } from '../../metadata/types';
import type { ClassRef } from '../class-ref';
import {
  BooleanFilter,
  DateFilter,
  FloatFilter,
  IDFilter,
  IntFilter,
  JsonFilter,
  StringFilter,
} from '../filters';

const FILTER_BY_SCALAR: Record<GqlScalarKind, ClassRef> = {
  Int: IntFilter,
  Float: FloatFilter,
  Boolean: BooleanFilter,
  ID: IDFilter,
  DateTime: DateFilter,
  JSON: JsonFilter,
  String: StringFilter,
};

export function getFilterClassForScalar(kind: GqlScalarKind): ClassRef {
  return FILTER_BY_SCALAR[kind] ?? FILTER_BY_SCALAR.String;
}
