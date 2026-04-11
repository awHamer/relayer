import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class CategoryEntity extends createRelayerEntity(schema, 'categories') {}
