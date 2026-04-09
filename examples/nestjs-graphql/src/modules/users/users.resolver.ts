import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

import { UserEntity, type EM } from '../../entities';
import { UsersService } from './users.service';

@GqlResolver(UserEntity, {
  name: 'User',
  queries: {
    list: { name: 'users', pagination: 'both' },
    findById: { name: 'user' },
    count: { name: 'usersCount' },
    aggregate: { name: 'usersAggregate' },
  },
  mutations: {
    createOne: { name: 'createUser' },
    updateOne: { name: 'updateUser' },
    deleteOne: { name: 'deleteUser' },
  },
})
export class UsersResolver extends RelayerResolver<UserEntity, EM> {
  constructor(usersService: UsersService) {
    super(usersService);
  }
}
