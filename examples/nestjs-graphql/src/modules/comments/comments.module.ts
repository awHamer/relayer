import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs-crud';

import { CommentEntity } from '../../entities';
import { CommentsResolver } from './comments.resolver';
import { CommentsService } from './comments.service';

@Module({
  imports: [RelayerModule.forFeature([CommentEntity])],
  providers: [CommentsService, CommentsResolver],
})
export class CommentsModule {}
