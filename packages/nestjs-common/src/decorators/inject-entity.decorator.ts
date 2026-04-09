import { Inject } from '@nestjs/common';
import type { RelayerEntityClass } from '@relayerjs/core';

import { RELAYER_ENTITY_PREFIX } from '../constants';
import { getEntityKey } from '../utils';

export function getEntityToken(entity: RelayerEntityClass): string {
  return `${RELAYER_ENTITY_PREFIX}${getEntityKey(entity)}`;
}

export function InjectEntity(entity: RelayerEntityClass): ParameterDecorator {
  return Inject(getEntityToken(entity));
}
