import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RelationMutationResult {
  @Field(() => Boolean)
  success!: boolean;
}
