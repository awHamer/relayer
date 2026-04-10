import { GqlResolver, RelayerResolver } from '@relayerjs/nestjs-graphql';

import { UserEntity, type EM } from '../../entities';
import { UsersService } from './users.service';

@GqlResolver(UserEntity, {
  name: 'User',
})
export class UsersResolver extends RelayerResolver<UserEntity, EM> {
  constructor(usersService: UsersService) {
    super(usersService);
  }
}
