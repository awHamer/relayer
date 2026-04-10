import { describe, expect, it } from 'vitest';

import { resolveOperationNames } from '../../src/decorators/resolve-operation-names';

describe('resolveOperationNames', () => {
  describe('default config', () => {
    it('generates all operations for "User"', () => {
      const result = resolveOperationNames('User', {});
      expect(result.queries).toEqual({
        listConnection: 'users',
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
      expect(result.queries.listConnection).toBe('posts');
      expect(result.queries.findById).toBe('post');
      expect(result.queries.count).toBe('postsCount');
      expect(result.queries.aggregate).toBe('postsAggregate');
      expect(result.mutations.createOne).toBe('createPost');
      expect(result.mutations.updateOne).toBe('updatePost');
      expect(result.mutations.deleteOne).toBe('deletePost');
    });

    it('does not double-s names already ending in s', () => {
      const result = resolveOperationNames('Address', {});
      expect(result.queries.listConnection).toBe('address');
      expect(result.queries.findById).toBe('address');
      expect(result.queries.count).toBe('addressCount');
    });
  });

  describe('pagination modes', () => {
    it('defaults to cursor pagination (listConnection set, list undefined)', () => {
      const result = resolveOperationNames('User', {});
      expect(result.queries.listConnection).toBe('users');
      expect(result.queries.list).toBeUndefined();
    });

    it('offset pagination (list set, listConnection undefined)', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: 'offset' } },
      });
      expect(result.queries.list).toBe('users');
      expect(result.queries.listConnection).toBeUndefined();
    });

    it('cursor pagination explicit', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: 'cursor' } },
      });
      expect(result.queries.listConnection).toBe('users');
      expect(result.queries.list).toBeUndefined();
    });

    it('both pagination modes', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: 'both' } },
      });
      expect(result.queries.listConnection).toBe('users');
      expect(result.queries.list).toBe('usersOffset');
    });

    it('both with custom name', () => {
      const result = resolveOperationNames('User', {
        queries: { list: { pagination: 'both', name: 'allUsers' } },
      });
      expect(result.queries.listConnection).toBe('allUsers');
      expect(result.queries.list).toBe('allUsersOffset');
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
      expect(result.queries.listConnection).toBe('allPosts');
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
      expect(result.queries.listConnection).toBeUndefined();
      expect(result.queries.list).toBeUndefined();
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
      expect(result.queries.listConnection).toBe('posts');
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
});
