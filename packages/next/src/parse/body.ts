import { JsonParseError } from '../errors';

export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    throw new JsonParseError('Invalid JSON in request body');
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new JsonParseError('Request body must be a JSON object');
  }

  return body as Record<string, unknown>;
}
