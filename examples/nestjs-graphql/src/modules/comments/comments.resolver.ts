import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

import { CommentEntity, type EM } from '../../entities';
import { CommentsService } from './comments.service';

@GqlResolver(CommentEntity, {
  name: 'Comment',
  queries: {
    list: { name: 'comments', pagination: 'both' },
    findById: { name: 'comment' },
    count: { name: 'commentsCount' },
    aggregate: { name: 'commentsAggregate' },
  },
  mutations: {
    createOne: { name: 'createComment' },
    updateOne: { name: 'updateComment' },
    deleteOne: { name: 'deleteComment' },
  },
})
export class CommentsResolver extends RelayerResolver<CommentEntity, EM> {
  constructor(commentsService: CommentsService) {
    super(commentsService);
  }
}
