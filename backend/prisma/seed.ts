import "dotenv/config";
import prisma from "../src/lib/prisma";
import { GearStatus } from "../src/generated/prisma/client";

async function main() {
  const existingGear = await prisma.gear.count();
  if (existingGear > 0) {
    console.log(`Gear already seeded (${existingGear} items), skipping.`);
    return;
  }

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

  console.log("Seeded: 5 gear items");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
