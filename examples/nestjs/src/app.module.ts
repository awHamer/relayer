import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs';

import { db } from './db';
import { CommentEntity, PostEntity, UserEntity } from './entities';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import * as schema from './schema';

@Module({
  imports: [
    RelayerModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity, CommentEntity],
      defaultRelationLimit: 50,
      baseUrl: () => `http://localhost:${process.env.PORT ?? 3000}`,
    }),
    PostsModule,
    CommentsModule,
  ],
})
export class AppModule {}
