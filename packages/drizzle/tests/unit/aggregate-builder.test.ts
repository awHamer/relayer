import { buildAggregate } from '../../src/builders/aggregate-builder';
import { buildRegistry } from '../../src/introspect';
import * as pgSchema from '../fixtures/pg-schema';
import { orders } from '../fixtures/pg-schema';

const { registry, tables } = buildRegistry(pgSchema as unknown as Record<string, unknown>);
const ordersMetadata = registry.get('orders')!;
const schema = pgSchema as unknown as Record<string, unknown>;

describe('buildAggregate', () => {
  it('_count: true produces _count in selectColumns', () => {
    const result = buildAggregate({ _count: true }, orders, ordersMetadata, tables, schema);
    expect(result.selectColumns).toHaveProperty('_count');
  });

  it('_sum on total produces _sum_total in selectColumns', () => {
    const result = buildAggregate(
      { _sum: { total: true } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('_sum_total');
  });

  it('_avg on total produces _avg_total in selectColumns', () => {
    const result = buildAggregate(
      { _avg: { total: true } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('_avg_total');
  });

  it('_min on total produces _min_total in selectColumns', () => {
    const result = buildAggregate(
      { _min: { total: true } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('_min_total');
  });

  it('_max on total produces _max_total in selectColumns', () => {
    const result = buildAggregate(
      { _max: { total: true } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('_max_total');
  });

  it('multiple aggregate functions produce all expected keys', () => {
    const result = buildAggregate(
      { _count: true, _sum: { total: true }, _avg: { total: true } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('_count');
    expect(result.selectColumns).toHaveProperty('_sum_total');
    expect(result.selectColumns).toHaveProperty('_avg_total');
  });

  it('groupBy on scalar field produces one groupByColumn and adds key to selectColumns', () => {
    const result = buildAggregate({ groupBy: ['status'] }, orders, ordersMetadata, tables, schema);
    expect(result.groupByColumns).toHaveLength(1);
    expect(result.selectColumns).toHaveProperty('status');
  });

  it('groupBy with _count produces both groupBy column and _count in selectColumns', () => {
    const result = buildAggregate(
      { groupBy: ['status'], _count: true },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).toHaveProperty('status');
    expect(result.selectColumns).toHaveProperty('_count');
    expect(result.groupByColumns).toHaveLength(1);
  });

  it('dot notation groupBy creates a join and uses aliased key in selectColumns', () => {
    const result = buildAggregate(
      { groupBy: ['user.firstName'] },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.joins).toHaveLength(1);
    expect(result.selectColumns).toHaveProperty('user_firstName');
    expect(result.groupByColumns).toHaveLength(1);
  });

  it('disabled aggregate field (false) is excluded from selectColumns', () => {
    const result = buildAggregate(
      { _sum: { total: false } },
      orders,
      ordersMetadata,
      tables,
      schema,
    );
    expect(result.selectColumns).not.toHaveProperty('_sum_total');
  });

  it('empty options produce empty selectColumns and no groupBy', () => {
    const result = buildAggregate({}, orders, ordersMetadata, tables, schema);
    expect(Object.keys(result.selectColumns)).toHaveLength(0);
    expect(result.groupByColumns).toHaveLength(0);
    expect(result.joins).toHaveLength(0);
  });
});
