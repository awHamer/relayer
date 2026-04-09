import { Field, GraphQLISODateTime, InputType } from '@nestjs/graphql';

@InputType()
export class DateFilter {
  @Field(() => GraphQLISODateTime, { nullable: true })
  eq?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  ne?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  gt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  gte?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lt?: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lte?: Date;

  @Field(() => [GraphQLISODateTime], { nullable: true })
  in?: Date[];

  @Field(() => [GraphQLISODateTime], { nullable: true })
  notIn?: Date[];

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;
}
