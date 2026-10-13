import { config as loadEnv } from "dotenv";
import { assertDevelopmentDatabase } from "../scripts/development-target.mjs";

// dotenv's array form preserves .env.local precedence and fills missing values
// from .env. Load it before importing the module that constructs PrismaClient.
loadEnv({ path: [".env.local", ".env"] });
assertDevelopmentDatabase();

const [{ Prisma }, { prisma }] = await Promise.all([
  import("../src/generated/prisma/client"),
  import("../src/server/db/prisma"),
]);

// Seed accounts are fixture identities, never usable login accounts. The
// sentinel is intentionally not a hash accepted by any authentication flow.
const DISABLED_SEED_PASSWORD = "disabled:seed-only:non-loginable";
const FIXTURE_NOW = new Date("2026-10-13T12:00:00.000Z");
const daysFromFixtureDate = (days: number) =>
  new Date(FIXTURE_NOW.getTime() + days * 86_400_000);

const teamRows = [
  {
    id: "team-platform-operations",
    name: "Platform Operations",
    department: "Engineering",
    description: "Fictional team coordinating platform operations.",
    isActive: true,
  },
  {
    id: "team-customer-success",
    name: "Customer Success",
    department: "Operations",
    description: "Fictional team supporting customer delivery.",
    isActive: true,
  },
  {
    id: "team-fleet-response",
    name: "Fleet Response",
    department: "Operations",
    description: "Fictional team handling fleet service requests.",
    isActive: true,
  },
  {
    id: "team-data-quality",
    name: "Data Quality",
    department: "Engineering",
    description: "Fictional team resolving operational data issues.",
    isActive: true,
  },
  {
    id: "team-governance",
    name: "Governance",
    department: "Compliance",
    description: "Fictional team coordinating access and approvals.",
    isActive: true,
  },
].map((team) => ({ ...team, createdAt: FIXTURE_NOW }));

const employeeFixtures = [
  ["Maya Chen", "Operations Manager", "Engineering", "MANAGER", "team-platform-operations"],
  ["Noah Williams", "Application Developer", "Engineering", "DEVELOPER", "team-platform-operations"],
  ["Amina Hassan", "Customer Success Lead", "Operations", "ADMINISTRATOR", "team-customer-success"],
  ["Sofia Martinez", "Customer Success Manager", "Operations", "MANAGER", "team-customer-success"],
  ["Luca Moretti", "Fleet Operations Lead", "Operations", "MANAGER", "team-fleet-response"],
  ["Priya Nair", "Data Quality Analyst", "Engineering", "ANALYST", "team-data-quality"],
  ["Oliver Smith", "Governance Specialist", "Compliance", "ANALYST", "team-governance"],
  ["Emma Johnson", "Platform Engineer", "Engineering", "DEVELOPER", "team-platform-operations"],
  ["Mateo Garcia", "Fleet Coordinator", "Operations", "DEVELOPER", "team-fleet-response"],
  ["Hana Kim", "Data Engineer", "Engineering", "DEVELOPER", "team-data-quality"],
  ["Elias Brown", "Access Reviewer", "Compliance", "ANALYST", "team-governance"],
  ["Fatima Ali", "Customer Success Analyst", "Operations", "ANALYST", "team-customer-success"],
  ["Theo Martin", "Release Coordinator", "Engineering", "DEVELOPER", "team-platform-operations"],
  ["Aria Patel", "Data Operations Lead", "Engineering", "MANAGER", "team-data-quality"],
  ["Jonas Weber", "Fleet Support Engineer", "Operations", "DEVELOPER", "team-fleet-response"],
] as const;

const employeeIds = employeeFixtures.map((_, index) =>
  index === 0
    ? "employee-maya-chen"
    : index === 1
      ? "employee-noah-williams"
      : index === 2
        ? "employee-amina-hassan"
        : `employee-demo-${String(index + 1).padStart(3, "0")}`,
);

const employeeRows = employeeFixtures.map(([name, title, department, role, teamId], index) => {
  const emailSlug = name.toLowerCase().replaceAll(" ", ".");
  return {
    id: employeeIds[index],
    employeeNumber: `OX-${String(1001 + index).padStart(4, "0")}`,
    name,
    email: `${emailSlug}@example.test`,
    title,
    department,
    role,
    passwordHash: DISABLED_SEED_PASSWORD,
    isDemoAccount: true,
    isActive: true,
    teamId,
    createdAt: FIXTURE_NOW,
    updatedAt: FIXTURE_NOW,
  };
});

const customerFixtures = [
  ["Northstar Logistics", "Transportation"],
  ["Verdant Energy", "Renewable Energy"],
  ["Cedarline Foods", "Food Distribution"],
  ["Bluepeak Transit", "Public Transportation"],
  ["Harborlight Medical", "Healthcare"],
  ["SummitWorks Manufacturing", "Manufacturing"],
  ["Meadowbrook Utilities", "Utilities"],
  ["Redstone Materials", "Construction Materials"],
  ["Clearwater Freight", "Logistics"],
  ["Silverfern Retail", "Retail"],
  ["Westhaven Aviation", "Aviation"],
  ["Golden Field Agriculture", "Agriculture"],
  ["Stonebridge Telecom", "Telecommunications"],
  ["Brightpath Education", "Education"],
  ["Everwell Pharma", "Pharmaceuticals"],
  ["Ironwood Equipment", "Industrial Equipment"],
  ["Suncrest Water", "Water Services"],
  ["Mapleline Parcel", "Parcel Delivery"],
  ["CloudHarbor Systems", "Technology"],
  ["Pioneer Rail Group", "Rail Transportation"],
  ["Lakeside Housing", "Property Management"],
  ["Crownridge Chemicals", "Chemicals"],
  ["Openfield Markets", "Wholesale"],
  ["Northwind Cold Storage", "Cold Chain Logistics"],
  ["Elmstead Insurance", "Insurance"],
  ["Atlas Forge Works", "Heavy Industry"],
  ["Seabright Fisheries", "Food Production"],
  ["Greenway Mobility", "Mobility Services"],
  ["Fairview Diagnostics", "Healthcare"],
  ["Redleaf Packaging", "Packaging"],
] as const;

const customerIds = customerFixtures.map((_, index) =>
  index === 0
    ? "customer-northstar-logistics"
    : index === 1
      ? "customer-verdant-energy"
      : `customer-demo-${String(index + 1).padStart(3, "0")}`,
);

const customerRows = customerFixtures.map(([name, industry], index) => {
  const customerNumber = 1100 + index;
  return {
    id: customerIds[index],
    customerKey: index === 0 ? "CUS-1042" : index === 1 ? "CUS-1077" : `CUS-${customerNumber}`,
    name,
    industry,
    email:
      index === 0
        ? "operations@northstar.example.test"
        : index === 1
          ? "service@verdant.example.test"
          : `operations@customer-${String(index + 1).padStart(3, "0")}.example.test`,
    phone: `+1-555-010-${String(customerNumber).padStart(4, "0")}`,
    status: index % 9 === 8 ? "AT_RISK" : "ACTIVE",
    accountOwnerId: employeeIds[(index + 2) % employeeIds.length],
    createdAt: daysFromFixtureDate(-240 + index * 3),
    updatedAt: FIXTURE_NOW,
  };
});

const projectFixtures = [
  {
    id: "project-fleet-visibility",
    projectKey: "PRJ-2041",
    name: "Fleet Visibility Rollout",
    customerIndex: 0,
    teamIndex: 0,
    status: "IN_PROGRESS",
    priority: "HIGH",
    progress: 68,
    budget: "182500.00",
    startOffset: -45,
    dueOffset: 28,
  },
  {
    id: "project-grid-modernization",
    projectKey: "PRJ-2073",
    name: "Grid Modernization Pilot",
    customerIndex: 1,
    teamIndex: 1,
    status: "PLANNING",
    priority: "MEDIUM",
    progress: 12,
    budget: "97500.00",
    startOffset: 7,
    dueOffset: 70,
  },
  ...Array.from({ length: 18 }, (_, index) => {
    const sequence = index + 3;
    const customerIndex = (index + 2) % customerFixtures.length;
    return {
      id: `project-demo-${String(sequence).padStart(3, "0")}`,
      projectKey: `PRJ-${2100 + index}`,
      name: `${customerFixtures[customerIndex][0]} Operations Program`,
      customerIndex,
      teamIndex: index % teamRows.length,
      status: ["IN_PROGRESS", "PLANNING", "AT_RISK", "COMPLETED"][index % 4],
      priority: ["HIGH", "MEDIUM", "LOW"][index % 3],
      progress: [24, 46, 73, 100][index % 4],
      budget: `${(48000 + index * 7350).toFixed(2)}`,
      startOffset: -100 + index * 5,
      dueOffset: 15 + index * 7,
    };
  }),
];

const projectRows = projectFixtures.map((project) => ({
  id: project.id,
  projectKey: project.projectKey,
  name: project.name,
  description: `Fictional operations program for ${customerFixtures[project.customerIndex][0]}.`,
  customerId: customerIds[project.customerIndex],
  teamId: teamRows[project.teamIndex].id,
  status: project.status,
  priority: project.priority,
  startDate: daysFromFixtureDate(project.startOffset),
  dueDate: daysFromFixtureDate(project.dueOffset),
  progress: project.progress,
  budget: new Prisma.Decimal(project.budget),
  createdAt: daysFromFixtureDate(project.startOffset - 14),
  updatedAt: FIXTURE_NOW,
}));

const projectIdFor = (index: number) => projectRows[index].id;
const assignmentRows = projectRows.flatMap((project, projectIndex) => {
  const employees = [
    employeeIds[projectIndex % employeeIds.length],
    employeeIds[(projectIndex + 4) % employeeIds.length],
  ];
  return employees.map((employeeId, assignmentIndex) => ({
    id:
      projectIndex === 0 && assignmentIndex === 0
        ? "assignment-fleet-maya"
        : projectIndex === 0 && assignmentIndex === 1
          ? "assignment-fleet-noah"
          : projectIndex === 1 && assignmentIndex === 0
            ? "assignment-grid-amina"
            : `assignment-demo-${String(projectIndex + 1).padStart(3, "0")}-${assignmentIndex + 1}`,
    projectId: project.id,
    employeeId,
    assignedAt: FIXTURE_NOW,
  }));
});

const caseFixtures = Array.from({ length: 80 }, (_, index) => {
  const projectIndex = index % projectRows.length;
  const customerIndex = projectFixtures[projectIndex].customerIndex;
  const legacy = [
    {
      id: "case-route-delay",
      caseKey: "CASE-3048",
      title: "Route optimization data is delayed",
      description: "Route updates are delayed for two fictional regional depots.",
      customerIndex: 0,
      projectIndex: 0,
      assignedEmployeeIndex: 1,
      priority: "HIGH",
      status: "IN_PROGRESS",
      category: "DATA_QUALITY",
    },
    {
      id: "case-capacity-change",
      caseKey: "CASE-3052",
      title: "Additional pilot capacity requested",
      description: "A fictional customer requests a time-limited capacity increase.",
      customerIndex: 1,
      projectIndex: 1,
      assignedEmployeeIndex: 2,
      priority: "MEDIUM",
      status: "WAITING_APPROVAL",
      category: "CAPACITY",
    },
    {
      id: "case-access-review",
      caseKey: "CASE-3061",
      title: "Quarterly access review",
      description: "Review access for a fictional operations workspace release.",
      customerIndex: 0,
      projectIndex: 0,
      assignedEmployeeIndex: null,
      priority: "LOW",
      status: "OPEN",
      category: "ACCESS",
    },
  ][index];

  const priority = ["HIGH", "MEDIUM", "LOW"][index % 3];
  const status = ["OPEN", "IN_PROGRESS", "WAITING_APPROVAL", "RESOLVED"][index % 4];
  return {
    id: legacy?.id ?? `case-demo-${String(index + 1).padStart(3, "0")}`,
    caseKey: legacy?.caseKey ?? `CASE-${3100 + index}`,
    title: legacy?.title ?? `${["Shipment status mismatch", "Service window update", "Workspace access request", "Capacity planning review"][index % 4]} ${String(index + 1).padStart(2, "0")}`,
    description: legacy?.description ?? `Fictional ${["operational", "customer", "data quality", "governance"][index % 4]} case for review and resolution.`,
    customerId: customerIds[legacy?.customerIndex ?? customerIndex],
    projectId: projectIdFor(legacy?.projectIndex ?? projectIndex),
    assignedEmployeeId:
      legacy?.assignedEmployeeIndex === null
        ? null
        : employeeIds[legacy?.assignedEmployeeIndex ?? (index + 3) % employeeIds.length],
    priority: legacy?.priority ?? priority,
    status: legacy?.status ?? status,
    category: legacy?.category ?? ["DATA_QUALITY", "SERVICE", "ACCESS", "CAPACITY"][index % 4],
    slaDeadline: daysFromFixtureDate((index % 11) - 4),
    createdAt: daysFromFixtureDate(-60 + index),
    updatedAt: FIXTURE_NOW,
    revision: 0,
    resolutionDate: (legacy?.status ?? status) === "RESOLVED" ? daysFromFixtureDate(-1) : null,
  };
});

const approvalRows = Array.from({ length: 25 }, (_, index) => {
  const isLegacy = index === 0;
  const pending = index % 3 !== 1;
  const status = pending ? "PENDING" : index % 2 === 0 ? "APPROVED" : "REJECTED";
  return {
    id: isLegacy ? "approval-capacity-change" : `approval-demo-${String(index + 1).padStart(3, "0")}`,
    approvalKey: isLegacy ? "APR-4016" : `APR-${4100 + index}`,
    type: isLegacy ? "CAPACITY_CHANGE" : ["BUDGET_CHANGE", "CAPACITY_CHANGE", "SCOPE_CHANGE", "EXPEDITE"][index % 4],
    title: isLegacy ? "Temporary capacity increase" : `${["Capacity adjustment", "Budget exception", "Scope update", "Priority expedite"][index % 4]} request ${String(index + 1).padStart(2, "0")}`,
    justification: isLegacy
      ? "Support the fictional customer's pilot during its planned seasonal peak."
      : "Fictional approval fixture for demonstrating review workflows.",
    amount: new Prisma.Decimal((4200 + index * 975).toFixed(2)),
    status,
    caseId: caseFixtures[index].id,
    requestedById: isLegacy ? "employee-amina-hassan" : employeeIds[(index + 2) % employeeIds.length],
    reviewerId: pending ? null : employeeIds[index % employeeIds.length],
    reviewerComment: pending ? "" : status === "APPROVED" ? "Approved for the fictional demo." : "Declined in the fictional demo.",
    createdAt: daysFromFixtureDate(-20 + index),
    decidedAt: pending ? null : daysFromFixtureDate(-19 + index),
    revision: 0,
  };
});

const activityRows = [
  ...caseFixtures.flatMap((operationalCase, index) => {
    const actorId = operationalCase.assignedEmployeeId ?? employeeIds[index % employeeIds.length];
    const initialEvent = {
      id: index === 0 ? "event-seed-case-route" : `event-case-${String(index + 1).padStart(3, "0")}-created`,
      actorId,
      action: "CREATED",
      objectType: "OperationalCase",
      objectId: operationalCase.id,
      summary: index === 0 ? "Demo case created" : "Fictional operational case created",
      beforeJson: null,
      afterJson: JSON.stringify({ status: "OPEN", caseKey: operationalCase.caseKey }),
      createdAt: daysFromFixtureDate(-60 + index),
    };
    const followupEvent = {
      id: `event-case-${String(index + 1).padStart(3, "0")}-reviewed`,
      actorId: employeeIds[(index + 1) % employeeIds.length],
      action: ["ASSIGNED", "COMMENTED", "ESCALATED", "STATUS_UPDATED"][index % 4],
      objectType: "OperationalCase",
      objectId: operationalCase.id,
      summary: "Fictional case review activity",
      beforeJson: JSON.stringify({ status: "OPEN" }),
      afterJson: JSON.stringify({ status: operationalCase.status }),
      createdAt: daysFromFixtureDate(-30 + index),
    };
    return [initialEvent, followupEvent];
  }),
  {
    id: "event-seed-approval-capacity",
    actorId: "employee-amina-hassan",
    action: "APPROVAL_REQUESTED",
    objectType: "ApprovalRequest",
    objectId: "approval-capacity-change",
    summary: "Demo capacity approval requested",
    beforeJson: null,
    afterJson: JSON.stringify({ status: "PENDING", approvalKey: "APR-4016" }),
    createdAt: daysFromFixtureDate(-19),
  },
];

try {
  await prisma.$transaction(async (tx) => {
    // Inserts only; skipDuplicates makes reruns safe and never overwrites user
    // data. Parent records are inserted before their dependent rows.
    await tx.team.createMany({ data: teamRows, skipDuplicates: true });
    await tx.employee.createMany({ data: employeeRows, skipDuplicates: true });
    await tx.customer.createMany({ data: customerRows, skipDuplicates: true });
    await tx.project.createMany({ data: projectRows, skipDuplicates: true });
    await tx.projectAssignment.createMany({ data: assignmentRows, skipDuplicates: true });
    await tx.operationalCase.createMany({ data: caseFixtures, skipDuplicates: true });
    await tx.approvalRequest.createMany({ data: approvalRows, skipDuplicates: true });
    await tx.activityEvent.createMany({ data: activityRows, skipDuplicates: true });
  });

  console.log(
    "Inserted missing fictional fixtures (5 teams, 15 employees, 30 customers, 20 projects, 80 cases, 25 approvals, 161 activities); existing records were not changed.",
  );
} finally {
  await prisma.$disconnect();
}
