import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class BooleanFilter {
  @Field(() => Boolean, { nullable: true })
  eq?: boolean;

  @Field(() => Boolean, { nullable: true })
  ne?: boolean;

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;
}
