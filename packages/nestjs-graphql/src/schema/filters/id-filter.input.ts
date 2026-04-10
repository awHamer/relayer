import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class IDFilter {
  @Field(() => ID, { nullable: true })
  eq?: string | number;

  @Field(() => ID, { nullable: true })
  ne?: string | number;

  @Field(() => [ID], { nullable: true })
  in?: (string | number)[];

  @Field(() => [ID], { nullable: true })
  notIn?: (string | number)[];

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;
}
