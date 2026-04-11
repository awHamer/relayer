import { Module } from '@nestjs/common';
import { RelayerGraphqlModule } from '@relayerjs/nestjs-graphql';

import { db } from './db';
import {
  CategoryEntity,
  CommentEntity,
  PostCategoryEntity,
  PostEntity,
  UserEntity,
} from './entities';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import * as schema from './schema';

@Module({
  imports: [
    RelayerGraphqlModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity, CommentEntity, CategoryEntity, PostCategoryEntity],
      defaultRelationLimit: 50,
    }),
    UsersModule,
    PostsModule,
    CommentsModule,
  ],
})
export class AppModule {}
