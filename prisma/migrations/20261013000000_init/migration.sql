-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DEVELOPER',
    "passwordHash" TEXT NOT NULL,
    "isDemoAccount" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "customerKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "accountOwnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "projectKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "teamId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_assignments" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operational_cases" (
    "id" TEXT NOT NULL,
    "caseKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "projectId" TEXT,
    "assignedEmployeeId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "category" TEXT NOT NULL,
    "slaDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "resolutionDate" TIMESTAMP(3),

    CONSTRAINT "operational_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "approvalKey" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "caseId" TEXT,
    "requestedById" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewerComment" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "objectType" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeNumber_key" ON "employees"("employeeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_teamId_idx" ON "employees"("teamId");

-- CreateIndex
CREATE INDEX "employees_role_isActive_idx" ON "employees"("role", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerKey_key" ON "customers"("customerKey");

-- CreateIndex
CREATE INDEX "customers_status_archivedAt_idx" ON "customers"("status", "archivedAt");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectKey_key" ON "projects"("projectKey");

-- CreateIndex
CREATE INDEX "projects_customerId_idx" ON "projects"("customerId");

-- CreateIndex
CREATE INDEX "projects_teamId_status_idx" ON "projects"("teamId", "status");

-- CreateIndex
CREATE INDEX "projects_dueDate_idx" ON "projects"("dueDate");

-- CreateIndex
CREATE INDEX "project_assignments_employeeId_idx" ON "project_assignments"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "project_assignments_projectId_employeeId_key" ON "project_assignments"("projectId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "operational_cases_caseKey_key" ON "operational_cases"("caseKey");

-- CreateIndex
CREATE INDEX "operational_cases_status_priority_idx" ON "operational_cases"("status", "priority");

-- CreateIndex
CREATE INDEX "operational_cases_assignedEmployeeId_status_idx" ON "operational_cases"("assignedEmployeeId", "status");

-- CreateIndex
CREATE INDEX "operational_cases_customerId_idx" ON "operational_cases"("customerId");

-- CreateIndex
CREATE INDEX "operational_cases_projectId_idx" ON "operational_cases"("projectId");

-- CreateIndex
CREATE INDEX "operational_cases_slaDeadline_status_idx" ON "operational_cases"("slaDeadline", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_approvalKey_key" ON "approval_requests"("approvalKey");

-- CreateIndex
CREATE INDEX "approval_requests_status_createdAt_idx" ON "approval_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "approval_requests_reviewerId_status_idx" ON "approval_requests"("reviewerId", "status");

-- CreateIndex
CREATE INDEX "approval_requests_caseId_idx" ON "approval_requests"("caseId");

-- CreateIndex
CREATE INDEX "activity_events_createdAt_idx" ON "activity_events"("createdAt");

-- CreateIndex
CREATE INDEX "activity_events_objectType_objectId_createdAt_idx" ON "activity_events"("objectType", "objectId", "createdAt");

-- CreateIndex
CREATE INDEX "activity_events_actorId_createdAt_idx" ON "activity_events"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_cases" ADD CONSTRAINT "operational_cases_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_cases" ADD CONSTRAINT "operational_cases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operational_cases" ADD CONSTRAINT "operational_cases_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "operational_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
