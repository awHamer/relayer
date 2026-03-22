import { createRelayerEntity } from '@relayerjs/drizzle';

import * as schema from '../schema';

export class CommentEntity extends createRelayerEntity(schema, 'comments') {}
