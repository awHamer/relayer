import type { RequestContext } from '@relayerjs/nestjs-crud';

export interface AppUser {
  id: number;
  role: 'admin' | 'user';
}

// Full request-scoped context. Used by NestJS lifecycle hooks (afterCreate, beforeFind, ...).
export interface AppContext extends RequestContext {
  currentUser: AppUser;
}

// Slimmer query context. Flows into service.findMany / computed / derived field resolvers.
export interface AppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}
