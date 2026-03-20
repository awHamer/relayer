import { buildRegistry } from '../../src/introspect/registry-builder';
import { readRelations } from '../../src/introspect/relation-reader';
import { readSchema } from '../../src/introspect/schema-reader';
import { PgUser } from '../fixtures/entities';
import * as pgSchema from '../fixtures/pg-schema';

const schema = pgSchema as unknown as Record<string, unknown>;

describe('readSchema', () => {
  const tables = readSchema(schema);

  it('returns all 7 tables', () => {
    expect(tables.size).toBe(7);
    expect(tables.has('users')).toBe(true);
    expect(tables.has('posts')).toBe(true);
    expect(tables.has('comments')).toBe(true);
    expect(tables.has('orders')).toBe(true);
    expect(tables.has('profiles')).toBe(true);
  });

  it('each entry has correct tableName', () => {
    expect(tables.get('users')!.tableName).toBe('users');
    expect(tables.get('posts')!.tableName).toBe('posts');
    expect(tables.get('comments')!.tableName).toBe('comments');
    expect(tables.get('orders')!.tableName).toBe('orders');
    expect(tables.get('profiles')!.tableName).toBe('profiles');
  });

  it('users has expected scalar fields', () => {
    const usersFields = tables.get('users')!.scalarFields;
    expect(usersFields.has('id')).toBe(true);
    expect(usersFields.has('firstName')).toBe(true);
    expect(usersFields.has('lastName')).toBe(true);
    expect(usersFields.has('email')).toBe(true);
    expect(usersFields.has('metadata')).toBe(true);
    expect(usersFields.has('createdAt')).toBe(true);
  });

  it('metadata field has valueType json', () => {
    const metadataField = tables.get('users')!.scalarFields.get('metadata')!;
    expect(metadataField.valueType).toBe('json');
  });

  it('id field has primaryKey true', () => {
    const idField = tables.get('users')!.scalarFields.get('id')!;
    expect(idField.primaryKey).toBe(true);
  });

  it('relation objects are not included as tables', () => {
    expect(tables.has('usersRelations')).toBe(false);
    expect(tables.has('postsRelations')).toBe(false);
    expect(tables.has('commentsRelations')).toBe(false);
    expect(tables.has('ordersRelations')).toBe(false);
    expect(tables.has('profilesRelations')).toBe(false);
  });
});

describe('readRelations', () => {
  const relations = readRelations(schema);

  it('returns Map with entity names', () => {
    expect(relations.has('users')).toBe(true);
    expect(relations.has('posts')).toBe(true);
    expect(relations.has('comments')).toBe(true);
    expect(relations.has('orders')).toBe(true);
    expect(relations.has('profiles')).toBe(true);
  });

  it('users has posts, comments, orders, and profile relations', () => {
    const usersRelations = relations.get('users')!;
    expect(usersRelations.has('posts')).toBe(true);
    expect(usersRelations.has('comments')).toBe(true);
    expect(usersRelations.has('orders')).toBe(true);
    expect(usersRelations.has('profile')).toBe(true);
  });

  it('users posts relation is many', () => {
    const usersRelations = relations.get('users')!;
    expect(usersRelations.get('posts')!.relationType).toBe('many');
  });

  it('users profile relation is one', () => {
    const usersRelations = relations.get('users')!;
    expect(usersRelations.get('profile')!.relationType).toBe('one');
  });

  it('posts has author relation targeting users', () => {
    const postsRelations = relations.get('posts')!;
    const authorRelation = postsRelations.get('author')!;
    expect(authorRelation.relationType).toBe('one');
    expect(authorRelation.targetEntity).toBe('users');
  });
});

describe('buildRegistry', () => {
  it('returns registry with all table entities', () => {
    const { registry } = buildRegistry(schema);
    expect(registry.has('users')).toBe(true);
    expect(registry.has('posts')).toBe(true);
    expect(registry.has('comments')).toBe(true);
    expect(registry.has('orders')).toBe(true);
    expect(registry.has('profiles')).toBe(true);
  });

  it('registry entity has correct scalarFields and relationFields', () => {
    const { registry } = buildRegistry(schema);
    const usersMetadata = registry.get('users')!;

    expect(usersMetadata.scalarFields.has('id')).toBe(true);
    expect(usersMetadata.scalarFields.has('firstName')).toBe(true);
    expect(usersMetadata.scalarFields.has('email')).toBe(true);

    expect(usersMetadata.relationFields.has('posts')).toBe(true);
    expect(usersMetadata.relationFields.has('profile')).toBe(true);
  });

  it('with class entity: computed fields added to metadata', () => {
    const { registry } = buildRegistry(schema, { users: PgUser });
    const usersMetadata = registry.get('users')!;
    expect(usersMetadata.computedFields.has('fullName')).toBe(true);
    expect(usersMetadata.computedFields.get('fullName')!.kind).toBe('computed');
  });

  it('with class entity: derived fields added to metadata', () => {
    const { registry } = buildRegistry(schema, { users: PgUser });
    const usersMetadata = registry.get('users')!;
    expect(usersMetadata.derivedFields.has('postsCount')).toBe(true);
    expect(usersMetadata.derivedFields.get('postsCount')!.kind).toBe('derived');
    expect(usersMetadata.derivedFields.has('orderSummary')).toBe(true);
  });

  it('without entities config: no computed or derived fields', () => {
    const { registry } = buildRegistry(schema);
    const usersMetadata = registry.get('users')!;
    expect(usersMetadata.computedFields.size).toBe(0);
    expect(usersMetadata.derivedFields.size).toBe(0);
  });

  it('tables Map has TableInfo with table reference', () => {
    const { tables } = buildRegistry(schema);
    const usersTableInfo = tables.get('users')!;
    expect(usersTableInfo.table).toBe(pgSchema.users);
    expect(usersTableInfo.tableName).toBe('users');
    expect(usersTableInfo.scalarFields).toBeInstanceOf(Map);
  });
});
