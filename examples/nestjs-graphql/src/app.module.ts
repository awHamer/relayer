import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { RelayerModule } from '@relayerjs/nestjs-crud';

import { db } from './db';
import { CommentEntity, PostEntity, UserEntity } from './entities';
import { CommentsModule } from './modules/comments/comments.module';
import { PostsModule } from './modules/posts/posts.module';
import { UsersModule } from './modules/users/users.module';
import * as schema from './schema';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      context: (ctx: { req: unknown }) => ({ req: ctx.req }),
    }),
    RelayerModule.forRoot({
      db,
      schema,
      entities: [UserEntity, PostEntity, CommentEntity],
      defaultRelationLimit: 50,
    }),
    UsersModule,
    PostsModule,
    CommentsModule,
  ],
})
export class AppModule {}
