# Ontix Foundry Ontology schema and workflows

The six object types and five foreign-key link types below are saved to `ontix Ontology` on Main. The source datasets in [`foundry/demo-data`](../foundry/demo-data/README.md) contain fictional records. Customer and ApprovalRequest now use derived index-compatible datasets; their original uploaded datasets remain unchanged.

## Object types

| Object type | Backing dataset | Primary key | Properties |
| --- | --- | --- | --- |
| Customer | `ontix_customers_indexable` (derived from `ontix_customers`) | `id` | `name` (string), `industry` (string), `status` (string/enum), `createdAt` (timestamp) |
| Project | `ontix_projects` | `id` | `customerId` (foreign key), `name` (string), `status` (string/enum), `budget` (numeric), `startDate` (date) |
| Team | `ontix_teams` | `id` | `name` (string), `department` (string) |
| Employee | `ontix_employees` | `id` | `name` (string), `email` (string), `teamId` (foreign key), `role` (string/enum) |
| OperationalCase | `ontix_operational_cases` | `id` | `projectId` (foreign key), `title` (string), `priority` (string/enum), `status` (string/enum), `assignedEmployeeId` (foreign key) |
| ApprovalRequest | `ontix_approval_requests_indexable` (derived from `ApprovalRequests`) | `id` | `caseId` (foreign key), `requestedBy` (Employee ID), `status` (string/enum), `createdAt` (timestamp) |

The two derived pipelines convert Foundry's legacy `OffsetDateTime` struct to a UTC `Timestamp`. Their outputs contain four rows each; both object types report **Indexed** on Main. This preserves the uploaded source datasets and fixes the prior property-type mismatch.

Keep the foreign-key properties available in the datasets for stable backing links. The current source uses fictional `example.com` Employee emails and contains no Foundry user ID mapping or active-state field. Avoid placing credentials or personal data in these fictional records.

## Link types

| From | To | Backing key | Expected cardinality |
| --- | --- | --- | --- |
| Customer | Project | `Project.customerId` → `Customer.id` | One customer to many projects |
| Project | OperationalCase | `OperationalCase.projectId` → `Project.id` | One project to many cases |
| Employee | Team | `Employee.teamId` → `Team.id` | Many employees to one team |
| Employee | OperationalCase | `OperationalCase.assignedEmployeeId` → `Employee.id` | One employee to many assigned cases |
| OperationalCase | ApprovalRequest | `ApprovalRequest.caseId` → `OperationalCase.id` | One case to many approval requests |

`ApprovalRequest.requestedBy` maps to an Employee primary key in the fixture. If the final business model wants a Foundry user identity rather than an employee relationship, change the column and link definition before creating the type.

## Action types and remaining design gates

Saved and included in the Developer Console app restriction: `UpdateCaseStatus`, `AssignCaseToEmployee`, and `UpdateProjectStatus`. They use snapshot isolation. Assignment accepts an existing Employee while the case is OPEN, IN_PROGRESS, or WAITING_APPROVAL; the current Employee schema cannot enforce active-only assignment.

`ApproveRequest` and `RejectRequest` are not yet created. Before enabling them, map the current Foundry user to the requester's stable identity and enforce “not requester” in submission criteria. Each decision must update the pending ApprovalRequest and its matching WAITING_APPROVAL case atomically. Snapshot isolation is appropriate because competing decisions write both same objects and a write conflict should reject one action. Test Run should show the proposed two-object edit before any regular submission.

Foundry Action Log records successful Ontology action submissions. Ontix's local activity log remains separate; do not claim the Foundry log substitutes for Ontix audit history.
