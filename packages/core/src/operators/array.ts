export interface ArrayOperators<T = unknown> {
  arrayContains?: T[];
  arrayContained?: T[];
  arrayOverlaps?: T[];
  isNull?: boolean;
  isNotNull?: boolean;
}
