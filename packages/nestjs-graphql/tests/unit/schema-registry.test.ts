import { afterEach, describe, expect, it } from 'vitest';

import { SchemaRegistry } from '../../src/schema/registry';

describe('SchemaRegistry', () => {
  afterEach(() => {
    SchemaRegistry.getInstance().reset();
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = SchemaRegistry.getInstance();
      const b = SchemaRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('toGqlName', () => {
    it('capitalizes first letter', () => {
      expect(SchemaRegistry.getInstance().toGqlName('users')).toBe('Users');
    });

    it('strips Entity suffix', () => {
      expect(SchemaRegistry.getInstance().toGqlName('userEntity')).toBe('User');
    });

    it('strips Entity suffix case-sensitive', () => {
      expect(SchemaRegistry.getInstance().toGqlName('postEntity')).toBe('Post');
    });

    it('does not strip entity in the middle', () => {
      expect(SchemaRegistry.getInstance().toGqlName('entityManager')).toBe('EntityManager');
    });

    it('handles already-capitalized name', () => {
      expect(SchemaRegistry.getInstance().toGqlName('User')).toBe('User');
    });
  });

  describe('gqlName storage', () => {
    it('setGqlName / getGqlName round-trip', () => {
      const reg = SchemaRegistry.getInstance();
      reg.setGqlName('posts', 'BlogPost');
      expect(reg.getGqlName('posts')).toBe('BlogPost');
    });

    it('getGqlName falls back to toGqlName when not set', () => {
      const reg = SchemaRegistry.getInstance();
      expect(reg.getGqlName('users')).toBe('Users');
    });
  });

  describe('build jobs', () => {
    const fakeEntity = { name: 'users' } as any;
    const fakeEntity2 = { name: 'posts' } as any;

    it('enqueueBuild and takeBuildJobs', () => {
      const reg = SchemaRegistry.getInstance();
      reg.enqueueBuild(fakeEntity);
      const jobs = reg.takeBuildJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].entity).toBe(fakeEntity);
    });

    it('takeBuildJobs returns empty after drain', () => {
      const reg = SchemaRegistry.getInstance();
      reg.enqueueBuild(fakeEntity);
      reg.takeBuildJobs();
      expect(reg.takeBuildJobs()).toHaveLength(0);
    });

    it('enqueueBuild same entity twice keeps first only', () => {
      const reg = SchemaRegistry.getInstance();
      reg.enqueueBuild(fakeEntity, { include: ['id'] });
      reg.enqueueBuild(fakeEntity, { include: ['id', 'title'] });
      const jobs = reg.takeBuildJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].fieldsConfig).toEqual({ include: ['id'] });
    });

    it('enqueueBuild different entities', () => {
      const reg = SchemaRegistry.getInstance();
      reg.enqueueBuild(fakeEntity);
      reg.enqueueBuild(fakeEntity2);
      expect(reg.takeBuildJobs()).toHaveLength(2);
    });

    it('passes fieldsConfig, filterable, orderable', () => {
      const reg = SchemaRegistry.getInstance();
      reg.enqueueBuild(fakeEntity, { exclude: ['password'] }, ['title'], ['createdAt']);
      const jobs = reg.takeBuildJobs();
      expect(jobs[0].fieldsConfig).toEqual({ exclude: ['password'] });
      expect(jobs[0].filterable).toEqual(['title']);
      expect(jobs[0].orderable).toEqual(['createdAt']);
    });
  });

  describe('reset', () => {
    it('clears all state', () => {
      const reg = SchemaRegistry.getInstance();
      reg.setGqlName('users', 'Person');
      reg.enqueueBuild({ name: 'users' } as any);
      reg.reset();
      expect(reg.getGqlName('users')).toBe('Users');
      expect(reg.takeBuildJobs()).toHaveLength(0);
    });
  });
});
