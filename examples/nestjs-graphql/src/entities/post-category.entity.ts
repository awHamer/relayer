import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class PostCategoryEntity extends createRelayerEntity(schema, 'postCategories') {}
