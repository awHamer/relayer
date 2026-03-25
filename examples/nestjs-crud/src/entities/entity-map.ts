import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';
import { CommentEntity } from './comment.entity';

export const entities = { users: UserEntity, posts: PostEntity, comments: CommentEntity };
export type EM = typeof entities;
