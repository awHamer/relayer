import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class IntFilter {
  @Field(() => Int, { nullable: true })
  eq?: number;

  @Field(() => Int, { nullable: true })
  ne?: number;

  @Field(() => Int, { nullable: true })
  gt?: number;

  @Field(() => Int, { nullable: true })
  gte?: number;

  @Field(() => Int, { nullable: true })
  lt?: number;

  @Field(() => Int, { nullable: true })
  lte?: number;

  @Field(() => [Int], { nullable: true })
  in?: number[];

  @Field(() => [Int], { nullable: true })
  notIn?: number[];

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;
}
