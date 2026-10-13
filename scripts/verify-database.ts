import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const { prisma } = await import("../src/server/db/prisma");

try {
  const [result, customers, projects, cases, approvals] = await Promise.all([
    prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`,
    prisma.customer.count(),
    prisma.project.count(),
    prisma.operationalCase.count(),
    prisma.approvalRequest.count(),
  ]);

  if (result[0]?.ok !== 1) {
    throw new Error("Neon returned an unexpected health-check result.");
  }

  console.log(
    `Neon connectivity OK. Current records: ${customers} customers, ${projects} projects, ${cases} cases, ${approvals} approvals.`,
  );
} finally {
  await prisma.$disconnect();
}
