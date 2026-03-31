import "dotenv/config";
import { auth } from "../src/lib/auth";
import prisma from "../src/lib/prisma";
import { Role, GearStatus } from "../src/generated/prisma/client";

async function main() {
  // Clear existing data in dependency order (children before parents).
  // Session and Account cascade from User, but explicit deletion is safer.
  await prisma.loanItem.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.gear.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  // Create users via Better Auth so that passwords are properly hashed and
  // Account records are created — required for sign-in from the frontend.
  const aliceSignup = await auth.api.signUpEmail({
    body: {
      email: "alice@cameraclub.fi",
      password: "password123",
      name: "Alice Virtanen",
    },
  });

  const bobSignup = await auth.api.signUpEmail({
    body: {
      email: "bob@cameraclub.fi",
      password: "password123",
      name: "Bob Mäkinen",
    },
  });

  // Set roles and mark emails as verified
  await prisma.user.update({
    where: { id: aliceSignup.user.id },
    data: { role: Role.ADMIN, emailVerified: true },
  });

  await prisma.user.update({
    where: { id: bobSignup.user.id },
    data: { role: Role.MEMBER, emailVerified: true },
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
  console.log(`  alice@cameraclub.fi  (ADMIN)  — password: password123`);
  console.log(`  bob@cameraclub.fi    (MEMBER) — password: password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
