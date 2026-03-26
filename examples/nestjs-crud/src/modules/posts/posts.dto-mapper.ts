import { Injectable } from '@nestjs/common';
import { DtoMapper, type RequestContext } from '@relayerjs/nestjs-crud';

import type { PostEntity } from '../../entities';

interface CommentItem {
  id: number;
  content: string;
  author?: { id: number; fullName?: string };
}

interface PostListItem {
  id: number;
  title: string;
  published: boolean;
  comments?: CommentItem[];
}

interface PostDetail {
  id: number;
  title: string;
  content: string | null;
  published: boolean;
  tags: string[];
  authorId: number;
  createdAt: Date;
  comments?: CommentItem[];
}

@Injectable()
export class PostDtoMapper extends DtoMapper<PostEntity, PostListItem, PostDetail> {
  toListItem(entity: PostListItem): PostListItem {
    return entity;
  }

  toSingleItem(entity: PostEntity): PostDetail {
    return entity;
  }

  toCreateInput(input: Partial<PostEntity>, ctx: RequestContext) {
    return {
      ...input,
      authorId: (ctx.user as { id: number })?.id ?? 1,
    };
  }
}
