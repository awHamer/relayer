import { Field, ID, InputType } from '@nestjs/graphql';

/**
 * Shared input for relation remove mutations. Identifies a target by its primary key only,
 * since extra pivot columns are not needed for disconnection.
 */
@InputType()
export class RelationIdInput {
  @Field(() => ID)
  _id!: string | number;
}
