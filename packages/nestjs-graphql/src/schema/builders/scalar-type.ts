import { Float, GraphQLISODateTime, ID, Int, type ReturnTypeFunc } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { GqlScalarKind } from '../../metadata';

const SCALAR_TO_RETURN_TYPE: Record<GqlScalarKind, ReturnTypeFunc> = {
  Int: () => Int,
  Float: () => Float,
  Boolean: () => Boolean,
  ID: () => ID,
  DateTime: () => GraphQLISODateTime,
  JSON: () => GraphQLJSON,
  String: () => String,
};

export function getScalarReturnType(kind: GqlScalarKind): ReturnTypeFunc {
  return SCALAR_TO_RETURN_TYPE[kind] ?? SCALAR_TO_RETURN_TYPE.String;
}
