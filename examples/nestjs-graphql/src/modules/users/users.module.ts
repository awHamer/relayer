import { Module } from '@nestjs/common';
import { RelayerModule } from '@relayerjs/nestjs-crud';

import { UserEntity } from '../../entities';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [RelayerModule.forFeature([UserEntity])],
  providers: [UsersService, UsersResolver],
})
export class UsersModule {}
