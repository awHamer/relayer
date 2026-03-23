import { Injectable } from '@nestjs/common';
import { InjectEntity, RelayerService, type EntityClient } from '@relayerjs/nestjs-crud';

import { PostEntity } from '../../entities';

@Injectable()
export class PostsService extends RelayerService<PostEntity> {
  constructor(@InjectEntity(PostEntity) repo: EntityClient) {
    super(repo);
  }

  async findPublished() {
    return this.findMany({ where: { published: true } });
  }

  async publish(id: number) {
    return this.update({ id }, { published: true });
  }
}
