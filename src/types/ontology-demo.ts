export const ONTOLOGY_DEMO_OBJECT_TYPES = [
  "Customer",
  "Project",
  "Team",
  "Employee",
  "OperationalCase",
  "ApprovalRequest",
  "ActivityEvent",
] as const;

export type OntologyObjectType = (typeof ONTOLOGY_DEMO_OBJECT_TYPES)[number];

export type OntologyDemoNode = {
  type: OntologyObjectType;
  id: string;
  title: string;
  subtitle: string;
  status?: string;
};

export type OntologyDemoRelationship = {
  label: string;
  targetType: OntologyObjectType;
  objects: OntologyDemoNode[];
};

export type OntologyDemoObjectGraph = {
  object: OntologyDemoNode;
  relationships: OntologyDemoRelationship[];
};
