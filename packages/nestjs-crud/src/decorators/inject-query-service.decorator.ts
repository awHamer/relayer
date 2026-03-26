import { Inject } from '@nestjs/common';
import type { RelayerEntityClass } from '@relayerjs/core';

import { RELAYER_SERVICE_PREFIX } from '../constants';
import { getEntityKey } from '../utils';

export function getServiceToken(entity: RelayerEntityClass): string {
  return `${RELAYER_SERVICE_PREFIX}${getEntityKey(entity)}`;
}

export function InjectQueryService(entity: RelayerEntityClass): ParameterDecorator {
  return Inject(getServiceToken(entity));
}
