import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-common';
import type { RelayerInstance } from '@relayerjs/nestjs-common';

import { UserEntity, type EM } from '../../entities';

@Injectable()
export class UsersService extends RelayerService<UserEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, UserEntity);
  }
}
