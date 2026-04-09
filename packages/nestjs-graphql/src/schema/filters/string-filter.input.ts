import { Field, InputType } from '@nestjs/graphql';

import { FilterMode } from '../scalars/filter-mode.enum';

@InputType()
export class StringFilter {
  @Field(() => String, { nullable: true })
  eq?: string;

  @Field(() => String, { nullable: true })
  ne?: string;

  @Field(() => [String], { nullable: true })
  in?: string[];

  @Field(() => [String], { nullable: true })
  notIn?: string[];

  @Field(() => String, { nullable: true })
  contains?: string;

  @Field(() => String, { nullable: true })
  startsWith?: string;

  @Field(() => String, { nullable: true })
  endsWith?: string;

  @Field(() => String, { nullable: true })
  like?: string;

  @Field(() => String, { nullable: true })
  ilike?: string;

  @Field(() => Boolean, { nullable: true })
  isNull?: boolean;

  @Field(() => FilterMode, { nullable: true })
  mode?: FilterMode;
}
