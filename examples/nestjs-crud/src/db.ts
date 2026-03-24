import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://relayer:relayer@localhost:5433/relayer_dev';

export const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema,  logger: false });
