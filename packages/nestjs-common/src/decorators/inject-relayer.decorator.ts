import { Inject } from '@nestjs/common';

import { RELAYER_CLIENT } from '../constants';

export function InjectRelayer(): ParameterDecorator {
  return Inject(RELAYER_CLIENT);
}
