import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, GearStatus } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data in dependency order (children before parents)
  await prisma.loanItem.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.gear.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // Seed Users
  const alice = await prisma.user.create({
    data: {
      id: "seed-user-alice",
      email: "alice@cameraclub.fi",
      name: "Alice Virtanen",
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: "seed-user-bob",
      email: "bob@cameraclub.fi",
      name: "Bob Mäkinen",
      role: Role.MEMBER,
      emailVerified: true,
    },
  });

  // Seed Gear — 2 camera bodies, 3 lenses
  await prisma.gear.createMany({
    data: [
      {
        name: "Sony A7 IV",
        serialNumber: "SN-BODY-001",
        category: "Camera Body",
        status: GearStatus.AVAILABLE,
      },
      {
        name: "Canon EOS R5",
        serialNumber: "SN-BODY-002",
        category: "Camera Body",
        status: GearStatus.AVAILABLE,
      },
      {
        name: "Sony FE 50mm f/1.8",
        serialNumber: "SN-LENS-001",
        category: "Lens",
        status: GearStatus.AVAILABLE,
      },
      {
        name: "Canon RF 24-70mm f/2.8L",
        serialNumber: "SN-LENS-002",
        category: "Lens",
        status: GearStatus.AVAILABLE,
      },
      {
        name: "Sigma 85mm f/1.4 Art",
        serialNumber: "SN-LENS-003",
        category: "Lens",
        status: GearStatus.AVAILABLE,
      },
    ],
  });

  console.log("Seeded: 2 users, 5 gear items");
  console.log(`  Users: ${alice.email}, ${bob.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
