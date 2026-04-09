import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs-crud';

import { PostEntity } from '../../entities';
import { PostHooks } from './posts.hooks';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

@Module({
  imports: [RelayerModule.forFeature([PostEntity])],
  providers: [PostsService, PostsResolver, PostHooks],
})
export class PostsModule {}
