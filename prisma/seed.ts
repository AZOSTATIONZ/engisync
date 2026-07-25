import {
  PrismaClient,
  SystemRole,
  WorkspaceRole,
  DepartmentRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

function generateJoinCode() {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function main() {
  console.log("🌱 Seeding EngiSync database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin@engisync.dev" },
    update: {},
    create: {
      name: "EngiSync Admin",
      email: "admin@engisync.dev",
      emailVerified: new Date(),
      passwordHash,
      systemRole: SystemRole.ADMIN,
    },
  });

  // Group leader
  const leader = await prisma.user.upsert({
    where: { email: "leader@engisync.dev" },
    update: {},
    create: {
      name: "Tariro Leader",
      email: "leader@engisync.dev",
      emailVerified: new Date(),
      passwordHash,
      systemRole: SystemRole.INDIVIDUAL,
    },
  });

  // Member
  const member = await prisma.user.upsert({
    where: { email: "member@engisync.dev" },
    update: {},
    create: {
      name: "Kuda Member",
      email: "member@engisync.dev",
      emailVerified: new Date(),
      passwordHash,
      systemRole: SystemRole.INDIVIDUAL,
    },
  });

  // Standard engineering departments (created/administered by the admin).
  const departmentSeeds = [
    { code: "EE", name: "Electrical Engineering" },
    { code: "ELEC", name: "Electronic Engineering" },
    { code: "MECH", name: "Mechanical Engineering" },
    { code: "CIVIL", name: "Civil Engineering" },
    { code: "IE", name: "Industrial Engineering" },
    { code: "CHEM", name: "Chemical Engineering" },
    { code: "COMP", name: "Computer Engineering" },
    { code: "MINE", name: "Mining Engineering" },
  ];
  const departments: Record<string, string> = {};
  for (const d of departmentSeeds) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: {
        code: d.code,
        name: d.name,
        description: `${d.name} department`,
        createdById: admin.id,
        members: {
          create: [{ userId: admin.id, role: DepartmentRole.ADMIN }],
        },
      },
    });
    departments[d.code] = dept.id;
  }

  // Put the leader and member in the Electrical Engineering department.
  for (const userId of [leader.id, member.id]) {
    await prisma.departmentMember.upsert({
      where: { departmentId_userId: { departmentId: departments.EE, userId } },
      update: {},
      create: { departmentId: departments.EE, userId, role: DepartmentRole.MEMBER },
    });
  }

  // Sample workspace (a group within Electrical Engineering).
  const workspace = await prisma.workspace.upsert({
    where: { joinCode: "ENGI2026" },
    update: { departmentId: departments.EE },
    create: {
      name: "Final Year Robotics Project",
      description:
        "ESP32-based autonomous line-following robot with MATLAB analysis.",
      joinCode: "ENGI2026",
      pinHash: await bcrypt.hash("1234", 12),
      departmentId: departments.EE,
      leaderId: leader.id,
      members: {
        create: [
          { userId: leader.id, role: WorkspaceRole.LEADER },
          { userId: member.id, role: WorkspaceRole.MEMBER },
        ],
      },
    },
  });

  console.log("✅ Seed complete.");
  console.log({ admin: admin.email, leader: leader.email, member: member.email, workspace: workspace.name });
  console.log("🔑 All seeded users share the password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
