export interface RelationOperators<TWhere> {
  $exists?: boolean;
  $some?: TWhere;
  $every?: TWhere;
  $none?: TWhere;
}
