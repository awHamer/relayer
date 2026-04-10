import { Module } from '@nestjs/common';

import { PostHooks } from './posts.hooks';
import { PostsResolver } from './posts.resolver';
import { PostsService } from './posts.service';

@Module({
  providers: [PostsService, PostsResolver, PostHooks],
})
export class PostsModule {}
