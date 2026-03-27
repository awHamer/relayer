export interface StringOperators {
  eq?: string;
  ne?: string;
  in?: string[];
  notIn?: string[];
  like?: string;
  ilike?: string;
  notLike?: string;
  notIlike?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  isNull?: boolean;
  isNotNull?: boolean;
  mode?: 'default' | 'insensitive';
}
