import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs';

import { CommentEntity } from '../../entities';
import { CommentsController } from './comments.controller';

@Module({
  imports: [RelayerModule.forFeature([CommentEntity])],
  controllers: [CommentsController],
})
export class CommentsModule {}
