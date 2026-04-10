import { Injectable } from '@nestjs/common';
import { InjectRelayer, RelayerService } from '@relayerjs/nestjs-common';
import type { RelayerInstance, Where } from '@relayerjs/nestjs-common';

import type { AppQueryContext } from '../../common/app-context';
import { PostEntity, type EM } from '../../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity, EM, AppQueryContext> {
  constructor(@InjectRelayer() r: RelayerInstance<EM>) {
    super(r, PostEntity);
  }

  protected getDefaultWhere(
    upstream?: Where<PostEntity, EM>,
    ctx?: AppQueryContext,
  ): Where<PostEntity, EM> | undefined {
    if (!ctx || ctx.isAdmin) return upstream;
    const scoped: Where<PostEntity, EM> = {
      OR: [{ published: true }, { authorId: ctx.currentUserId }],
    };
    return upstream ? { AND: [upstream, scoped] } : scoped;
  }
}
