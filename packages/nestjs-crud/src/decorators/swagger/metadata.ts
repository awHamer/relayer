const API_OPERATION = 'swagger/apiOperation';
const API_RESPONSE = 'swagger/apiResponse';
const API_PARAMETERS = 'swagger/apiParameters';
const API_TAGS = 'swagger/apiUseTags';
const API_PRODUCES = 'swagger/apiProduces';

interface SwaggerParam {
  name: string;
  in: 'path' | 'query';
  required?: boolean;
  type?: string;
  description?: string;
  example?: unknown;
}

interface SwaggerResponse {
  status: number;
  description: string;
}

interface SwaggerBody {
  description?: string;
  schema?: unknown;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  type?: Function;
}

export interface SwaggerMeta {
  summary: string;
  description?: string;
  operationId?: string;
  params?: SwaggerParam[];
  body?: SwaggerBody;
  responses?: SwaggerResponse[];
}

function getMethodFn(proto: object, methodName: string): object | null {
  const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);
  return descriptor?.value as object | null;
}

export function setSwaggerMetadata(proto: object, methodName: string, meta: SwaggerMeta): void {
  const methodFn = getMethodFn(proto, methodName);
  if (!methodFn) return;

  Reflect.defineMetadata(
    API_OPERATION,
    {
      summary: meta.summary,
      ...(meta.description ? { description: meta.description } : {}),
      ...(meta.operationId ? { operationId: meta.operationId } : {}),
    },
    methodFn,
  );

  const apiParams: unknown[] = [];

  if (meta.params) {
    for (const p of meta.params) {
      apiParams.push({
        name: p.name,
        in: p.in,
        required: p.required ?? p.in === 'path',
        schema: {
          type: p.type ?? 'string',
          ...(p.example !== undefined ? { example: p.example } : {}),
        },
        ...(p.description ? { description: p.description } : {}),
        ...(p.example !== undefined ? { example: p.example } : {}),
      });
    }
  }

  if (meta.body) {
    apiParams.push({
      in: 'body',
      name: 'body',
      required: true,
      type: meta.body.type ?? String,
      ...(meta.body.schema ? { schema: meta.body.schema } : {}),
    });
  }

  if (apiParams.length > 0) {
    const existing = (Reflect.getMetadata(API_PARAMETERS, methodFn) as unknown[] | undefined) ?? [];
    Reflect.defineMetadata(API_PARAMETERS, [...existing, ...apiParams], methodFn);
  }

  if (meta.responses) {
    const responseMap: Record<string, { description: string }> = {};
    for (const r of meta.responses) {
      responseMap[String(r.status)] = { description: r.description };
    }
    Reflect.defineMetadata(API_RESPONSE, responseMap, methodFn);
  }

  Reflect.defineMetadata(API_PRODUCES, ['application/json'], methodFn);
}

export function setSwaggerTag(target: object, tag: string): void {
  Reflect.defineMetadata(API_TAGS, [tag], target);
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isClassConstructor(schema: unknown): schema is Function {
  return typeof schema === 'function' && schema.prototype !== undefined;
}

export function resolveBodyMeta(routeSchema: unknown | undefined): SwaggerBody | undefined {
  if (!routeSchema) return undefined;
  if (isClassConstructor(routeSchema)) return { type: routeSchema };
  return undefined;
}
