import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class PostEntity extends createRelayerEntity(schema, 'posts') {}
