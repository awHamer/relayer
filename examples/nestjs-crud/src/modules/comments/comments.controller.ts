import {
  CrudController,
  InjectQueryService,
  RelayerController,
  type RelayerService,
} from '@relayerjs/nestjs-crud';

import { CommentEntity } from '../../entities';

@CrudController({
  model: CommentEntity,
  path: 'posts/:postId/comments',
  params: {
    postId: { field: 'postId', type: 'number' },
  },
  routes: {
    list: {
      defaultLimit: 10,
      maxLimit: 50,
    },
    findById: true,
    create: true,
    delete: true,
  },
})
export class CommentsController extends RelayerController<CommentEntity> {
  constructor(@InjectQueryService(CommentEntity) service: RelayerService<CommentEntity>) {
    super(service as any);
  }
}
