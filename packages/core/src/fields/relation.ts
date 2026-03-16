export interface RelationFieldDef {
  kind: 'relation';
  name: string;
  relationType: 'one' | 'many';
  targetEntity: string;
}
