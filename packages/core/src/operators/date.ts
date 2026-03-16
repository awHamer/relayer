export interface DateOperators {
  eq?: Date | string;
  ne?: Date | string;
  gt?: Date | string;
  gte?: Date | string;
  lt?: Date | string;
  lte?: Date | string;
  in?: (Date | string)[];
  notIn?: (Date | string)[];
  isNull?: boolean;
  isNotNull?: boolean;
}
