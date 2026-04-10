import type { RequestContext } from '@relayerjs/nestjs-common';

export interface AppUser {
  id: number;
  role: 'admin' | 'user';
}

export interface AppContext extends RequestContext {
  currentUser: AppUser;
}

export interface AppQueryContext {
  currentUserId: number;
  isAdmin: boolean;
}
