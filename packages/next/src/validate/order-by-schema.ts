import { OrderByValidationError } from '../errors';

export function validateOrderBy(
  orderBy: Record<string, unknown> | Record<string, unknown>[] | undefined,
  allowedFields: string[] | undefined,
): Record<string, unknown> | Record<string, unknown>[] | undefined {
  if (!orderBy) return undefined;
  if (!allowedFields) return orderBy;

  const entries = Array.isArray(orderBy) ? orderBy : [orderBy];
  for (const entry of entries) {
    const field = entry.field as string;
    if (!allowedFields.includes(field)) {
      throw new OrderByValidationError(
        `Field "${field}" is not allowed in orderBy. Allowed: ${allowedFields.join(', ')}`,
      );
    }
  }

  return orderBy;
}
