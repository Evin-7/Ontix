import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { assertDevelopmentDatabase } from "./development-target.mjs";

loadEnv({ path: [".env.local", ".env"] });
assertDevelopmentDatabase();

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
const employeeNumber = process.env.BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!email || !name || !employeeNumber || !password) {
  throw new Error("Set BOOTSTRAP_ADMIN_NAME, BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER, and BOOTSTRAP_ADMIN_PASSWORD in .env.local.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("BOOTSTRAP_ADMIN_EMAIL must be a valid email address.");
if (password.length < 12 || password.length > 128) throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain 12 to 128 characters.");

const [{ prisma }, { auth }] = await Promise.all([
  import("../src/server/db/prisma"),
  import("../src/lib/auth"),
]);

try {
  const existingAuth = await prisma.authUser.findUnique({ where: { email }, select: { id: true } });
  if (existingAuth) throw new Error("An Ontix login already exists for this email. Admin bootstrap is one-time and does not replace existing accounts.");
  const existingAdministrator = await prisma.authUser.findFirst({
    where: { employee: { role: "ADMINISTRATOR", isActive: true } },
    select: { id: true },
  });
  if (existingAdministrator) throw new Error("An active Ontix administrator already exists; the bootstrap command cannot create another one.");

  const existingEmployee = await prisma.employee.findUnique({ where: { email } });
  if (existingEmployee?.isDemoAccount) {
    throw new Error("This email belongs to a demo fixture. Choose a real operator email for the administrator account.");
  }
  if (existingEmployee && !existingEmployee.isActive) {
    throw new Error("The matching employee is inactive. Reactivate it through an authorized process before bootstrap.");
  }
  if (!existingEmployee) {
    const numberInUse = await prisma.employee.findUnique({ where: { employeeNumber }, select: { id: true } });
    if (numberInUse) throw new Error("BOOTSTRAP_ADMIN_EMPLOYEE_NUMBER is already in use; choose another employee number.");
  }

  const context = await auth.$context;
  const passwordHash = await context.password.hash(password);
  const authUserId = `auth-${randomUUID()}`;

  await prisma.$transaction(async (tx) => {
    const employee = existingEmployee
      ? await tx.employee.update({ where: { id: existingEmployee.id }, data: { role: "ADMINISTRATOR" } })
      : await tx.employee.create({
          data: {
            id: `employee-${randomUUID()}`,
            employeeNumber,
            name,
            email,
            title: "Workspace Administrator",
            department: "Operations",
            role: "ADMINISTRATOR",
            passwordHash: "disabled:seed-only:non-loginable",
            isDemoAccount: false,
            isActive: true,
          },
        });

    await tx.authUser.create({
      data: {
        id: authUserId,
        name,
        email,
        emailVerified: true,
        employeeId: employee.id,
      },
    });
    await tx.authAccount.create({
      data: {
        id: `account-${randomUUID()}`,
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: passwordHash,
      },
    });
  });

  console.log(`Provisioned the Ontix administrator account for ${email}. Remove BOOTSTRAP_ADMIN_PASSWORD from .env.local now.`);
} finally {
  await prisma.$disconnect();
}
