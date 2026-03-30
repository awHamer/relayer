interface SwaggerParam {
  name: string;
  in: 'path' | 'query';
  required?: boolean;
  type?: string;
  description?: string;
  example?: unknown;
}

export const idParam: SwaggerParam = {
  name: 'id',
  in: 'path',
  type: 'string',
  required: true,
};

export const listQueryParams: SwaggerParam[] = [
  {
    name: 'where',
    in: 'query',
    type: 'string',
    description:
      'JSON filter with operators: eq, ne, gt, gte, lt, lte, in, contains, ilike, isNull, AND, OR, NOT',
    example: '{"published":true}',
  },
  {
    name: 'select',
    in: 'query',
    type: 'string',
    description: 'JSON object specifying which fields to return. Relations can be nested.',
    example: '{"id":true,"title":true,"author":{"fullName":true}}',
  },
  {
    name: 'orderBy',
    in: 'query',
    type: 'string',
    description: 'JSON sort: { field, order } or array of them',
    example: '{"field":"createdAt","order":"desc"}',
  },
  {
    name: 'sort',
    in: 'query',
    type: 'string',
    description: 'Shorthand sort: -field (desc), +field or field (asc)',
    example: '-createdAt',
  },
  {
    name: 'limit',
    in: 'query',
    type: 'number',
    description: 'Max items per page',
    example: 20,
  },
  {
    name: 'offset',
    in: 'query',
    type: 'number',
    description: 'Items to skip (offset pagination)',
    example: 0,
  },
  {
    name: 'search',
    in: 'query',
    type: 'string',
    description: 'Free-text search (if search callback configured)',
  },
  {
    name: 'cursor',
    in: 'query',
    type: 'string',
    description: 'Cursor token for cursor-based pagination',
  },
];

export const countQueryParams: SwaggerParam[] = [listQueryParams[0]!, listQueryParams[6]!];

export const aggregateQueryParams: SwaggerParam[] = [
  {
    name: 'where',
    in: 'query',
    type: 'string',
    description: 'JSON filter',
    example: '{"published":true}',
  },
  {
    name: 'groupBy',
    in: 'query',
    type: 'string',
    description: 'JSON array or comma-separated field names',
    example: 'status',
  },
  {
    name: '_count',
    in: 'query',
    type: 'string',
    description: 'Enable count: true or 1',
    example: 'true',
  },
  {
    name: '_sum',
    in: 'query',
    type: 'string',
    description: 'JSON fields to sum',
    example: '{"total":true}',
  },
  {
    name: '_avg',
    in: 'query',
    type: 'string',
    description: 'JSON fields to average',
    example: '{"total":true}',
  },
  {
    name: '_min',
    in: 'query',
    type: 'string',
    description: 'JSON fields for minimum',
    example: '{"total":true}',
  },
  {
    name: '_max',
    in: 'query',
    type: 'string',
    description: 'JSON fields for maximum',
    example: '{"total":true}',
  },
  {
    name: 'having',
    in: 'query',
    type: 'string',
    description: 'JSON having filter for aggregation groups',
    example: '{"_count":{"gt":5}}',
  },
];

export const relationBodySchema = {
  schema: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { oneOf: [{ type: 'number' }, { type: 'string' }, { type: 'object' }] },
      },
    },
    required: ['data'],
  },
};
