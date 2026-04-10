import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class JsonFilter {
  @Field(() => GraphQLJSON, { nullable: true })
  eq?: unknown;

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;
}
