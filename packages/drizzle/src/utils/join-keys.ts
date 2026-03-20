// Derived field subquery join key: "prefix__derived_fieldName"
export function derivedJoinKey(prefix: string, fieldName: string): string {
  return `${prefix}__derived_${fieldName}`;
}

// Aggregate-level derived field key: "__agg_derived_fieldPath"
export function aggDerivedKey(fieldPath: string): string {
  return `__agg_derived_${fieldPath}`;
}

// Derived object subfield column key: "fieldName_subField"
export function derivedSubFieldKey(fieldName: string, subField: string): string {
  return `${fieldName}_${subField}`;
}

// Derived subquery alias: "__derived_fieldName_N"
export function derivedAlias(fieldName: string, counter: number): string {
  return `__derived_${fieldName}_${counter}`;
}
