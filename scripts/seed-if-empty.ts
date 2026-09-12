import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.restaurant.count();
    if (count > 0) {
      console.log(`seed-if-empty: skip (${count} restaurants already)`);
      return;
    }
    console.log("seed-if-empty: empty DB, running prisma/seed.ts");
    const { execSync } = await import("node:child_process");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
