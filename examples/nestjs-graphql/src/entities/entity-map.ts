import { CategoryEntity } from './category.entity';
import { CommentEntity } from './comment.entity';
import { PostCategoryEntity } from './post-category.entity';
import { PostEntity } from './post.entity';
import { UserEntity } from './user.entity';

export const entities = {
  users: UserEntity,
  posts: PostEntity,
  comments: CommentEntity,
  categories: CategoryEntity,
  postCategories: PostCategoryEntity,
};
export type EM = typeof entities;
