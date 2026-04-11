import { describe, expect, it } from 'vitest';

import { resolveOperationNames } from '../../src/decorators/resolve-operation-names';
import { Pagination } from '../../src/types';

describe('resolveOperationNames', () => {
  describe('default config', () => {
    it('generates all operations for "User"', () => {
      const result = resolveOperationNames('User', {});
      expect(result.queries).toEqual({
        listCursor: 'users',
        findById: 'user',
        count: 'usersCount',
        aggregate: 'usersAggregate',
      });
      expect(result.mutations).toEqual({
        createOne: 'createUser',
        updateOne: 'updateUser',
        deleteOne: 'deleteUser',
      });
    });

    it('generates all operations for "Post"', () => {
      const result = resolveOperationNames('Post', {});
      expect(result.queries.listCursor).toBe('posts');
      expect(result.queries.findById).toBe('post');
      expect(result.queries.count).toBe('postsCount');
      expect(result.queries.aggregate).toBe('postsAggregate');
      expect(result.mutations.createOne).toBe('createPost');
      expect(result.mutations.updateOne).toBe('updatePost');
      expect(result.mutations.deleteOne).toBe('deletePost');
    });

    it('does not double-s names already ending in s', () => {
      const result = resolveOperationNames('Address', {});
      expect(result.queries.listCursor).toBe('address');
      expect(result.queries.findById).toBe('address');
      expect(result.queries.count).toBe('addressCount');
    });
  });

  describe('pagination modes', () => {
    it('defaults to cursor pagination', () => {
      const result = resolveOperationNames('User', {});
      expect(result.queries.listCursor).toBe('users');
      expect(result.queries.listOffset).toBeUndefined();
      expect(result.queries.listCursorEdges).toBeUndefined();
    });

    it('offset pagination', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: Pagination.Offset } },
      });
      expect(result.queries.listOffset).toBe('users');
      expect(result.queries.listCursor).toBeUndefined();
      expect(result.queries.listCursorEdges).toBeUndefined();
    });

    it('cursor pagination explicit', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: Pagination.Cursor } },
      });
      expect(result.queries.listCursor).toBe('users');
      expect(result.queries.listOffset).toBeUndefined();
      expect(result.queries.listCursorEdges).toBeUndefined();
    });

    it('cursor-edges pagination (Relay-style)', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: Pagination.CursorEdges } },
      });
      expect(result.queries.listCursorEdges).toBe('users');
      expect(result.queries.listCursor).toBeUndefined();
      expect(result.queries.listOffset).toBeUndefined();
    });

    it('accepts string literals for pagination mode', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: 'cursor-edges' } },
      });
      expect(result.queries.listCursorEdges).toBe('users');
    });
  });

  describe('custom names', () => {
    it('accepts custom query names', () => {
      const result = resolveOperationNames('Post', {
        queries: {
          list: { name: 'allPosts' },
          findById: { name: 'getPost' },
          count: { name: 'totalPosts' },
          aggregate: { name: 'postStats' },
        },
      });
      expect(result.queries.listCursor).toBe('allPosts');
      expect(result.queries.findById).toBe('getPost');
      expect(result.queries.count).toBe('totalPosts');
      expect(result.queries.aggregate).toBe('postStats');
    });

    it('accepts custom mutation names', () => {
      const result = resolveOperationNames('Post', {
        mutations: {
          createOne: { name: 'addPost' },
          updateOne: { name: 'editPost' },
          deleteOne: { name: 'removePost' },
        },
      });
      expect(result.mutations.createOne).toBe('addPost');
      expect(result.mutations.updateOne).toBe('editPost');
      expect(result.mutations.deleteOne).toBe('removePost');
    });
  });

  describe('disabling operations', () => {
    it('disables individual query', () => {
      const result = resolveOperationNames('User', {
        queries: { list: false, findById: true, count: true, aggregate: true },
      });
      expect(result.queries.listCursor).toBeUndefined();
      expect(result.queries.listOffset).toBeUndefined();
      expect(result.queries.listCursorEdges).toBeUndefined();
      expect(result.queries.findById).toBe('user');
    });

    it('disables individual mutation', () => {
      const result = resolveOperationNames('User', {
        mutations: { createOne: true, updateOne: true, deleteOne: false },
      });
      expect(result.mutations.deleteOne).toBeUndefined();
      expect(result.mutations.createOne).toBe('createUser');
    });

    it('disables all queries', () => {
      const result = resolveOperationNames('User', {
        queries: { list: false, findById: false, count: false, aggregate: false },
      });
      expect(result.queries).toEqual({});
    });

    it('disables all mutations', () => {
      const result = resolveOperationNames('User', {
        mutations: { createOne: false, updateOne: false, deleteOne: false },
      });
      expect(result.mutations).toEqual({});
    });
  });

  describe('boolean true enables with default name', () => {
    it('true for list uses cursor pagination', () => {
      const result = resolveOperationNames('Post', {
        queries: { list: true },
      });
      expect(result.queries.listCursor).toBe('posts');
    });

    it('true for mutations uses default names', () => {
      const result = resolveOperationNames('Post', {
        mutations: { createOne: true, updateOne: true, deleteOne: true },
      });
      expect(result.mutations.createOne).toBe('createPost');
      expect(result.mutations.updateOne).toBe('updatePost');
      expect(result.mutations.deleteOne).toBe('deletePost');
    });
  });

  describe('relations', () => {
    it('returns empty relations when not configured', () => {
      const result = resolveOperationNames('Post', {});
      expect(result.relations).toEqual({});
    });

    it('generates all 3 mutations when relation is true', () => {
      const result = resolveOperationNames('Post', {
        relations: { tags: true },
      });
      expect(result.relations.tags).toEqual({
        add: 'addTagsToPost',
        remove: 'removeTagsFromPost',
        set: 'setTagsOnPost',
      });
    });

    it('capitalizes relation name', () => {
      const result = resolveOperationNames('Post', {
        relations: { categories: true },
      });
      expect(result.relations.categories!.add).toBe('addCategoriesToPost');
      expect(result.relations.categories!.remove).toBe('removeCategoriesFromPost');
      expect(result.relations.categories!.set).toBe('setCategoriesOnPost');
    });

    it('uses entity gqlName in mutation names', () => {
      const result = resolveOperationNames('BlogPost', {
        relations: { tags: true },
      });
      expect(result.relations.tags!.add).toBe('addTagsToBlogPost');
    });

    it('skips relation set to false', () => {
      const result = resolveOperationNames('Post', {
        relations: { tags: true, hidden: false },
      });
      expect(result.relations.tags).toBeDefined();
      expect(result.relations.hidden).toBeUndefined();
    });

    it('selective ops: only enabled ops appear', () => {
      const result = resolveOperationNames('Post', {
        relations: { tags: { add: true, remove: true, set: false } },
      });
      expect(result.relations.tags!.add).toBe('addTagsToPost');
      expect(result.relations.tags!.remove).toBe('removeTagsFromPost');
      expect(result.relations.tags!.set).toBeUndefined();
    });

    it('selective ops: only set enabled', () => {
      const result = resolveOperationNames('Post', {
        relations: { tags: { add: false, remove: false, set: true } },
      });
      expect(result.relations.tags!.add).toBeUndefined();
      expect(result.relations.tags!.remove).toBeUndefined();
      expect(result.relations.tags!.set).toBe('setTagsOnPost');
    });

    it('multiple relations', () => {
      const result = resolveOperationNames('Post', {
        relations: { tags: true, categories: true },
      });
      expect(result.relations.tags!.add).toBe('addTagsToPost');
      expect(result.relations.categories!.add).toBe('addCategoriesToPost');
    });
  });
});
