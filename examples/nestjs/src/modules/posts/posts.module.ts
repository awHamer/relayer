import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs';

import { PostEntity } from '../../entities';
import { PostsController } from './posts.controller';
import { PostDtoMapper } from './posts.dto-mapper';
import { PostHooks } from './posts.hooks';
import { PostsService } from './posts.service';

@Module({
  imports: [RelayerModule.forFeature([PostEntity])],
  controllers: [PostsController],
  providers: [PostsService, PostDtoMapper, PostHooks],
  exports: [PostsService],
})
export class PostsModule {}
