import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-crud';
import type { RelayerInstance } from '@relayerjs/nestjs-crud';

import { CommentEntity, type EM } from '../../entities';

@Injectable()
export class CommentsService extends RelayerService<CommentEntity, EM> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, CommentEntity);
  }
}
