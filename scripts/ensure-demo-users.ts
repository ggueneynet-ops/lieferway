import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Upsert documented demo accounts without wiping restaurants or orders.
 * Password for all demo users: lieferway
 *
 *   npx tsx scripts/ensure-demo-users.ts
 *
 * Do not run `npx prisma db seed` on a live DB — that deletes restaurants.
 */
const DEMO_USERS = [
  { email: "admin@lieferway.de", name: "Lea Hoffmann", phone: "+49 69 12000001", role: "ADMIN", locale: "de" },
  { email: "kunde@lieferway.de", name: "Jonas Weber", phone: "+49 171 5550101", role: "CUSTOMER", locale: "de" },
  { email: "muster@lieferway.de", name: "Elif Yılmaz", phone: "+49 176 4440202", role: "CUSTOMER", locale: "tr" },
  {
    email: "restaurant@lieferway.de",
    name: "Mehmet Demir",
    phone: "+49 69 9000100",
    role: "RESTAURANT",
    locale: "de",
  },
  { email: "kurier@lieferway.de", name: "Emre Kaya", phone: "+49 162 3330303", role: "COURIER", locale: "de" },
  { email: "kurier2@lieferway.de", name: "Sophie Klein", phone: "+49 163 2220404", role: "COURIER", locale: "de" },
] as const;

async function main() {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash("lieferway", 10);
    for (const demo of DEMO_USERS) {
      const existing = await prisma.user.findUnique({ where: { email: demo.email } });
      if (existing) {
        await prisma.user.update({
          where: { email: demo.email },
          data: { passwordHash, name: existing.name || demo.name, role: existing.role || demo.role },
        });
        console.log(`updated ${demo.email} (${existing.role})`);
      } else {
        await prisma.user.create({
          data: {
            email: demo.email,
            passwordHash,
            name: demo.name,
            phone: demo.phone,
            role: demo.role,
            locale: demo.locale,
          },
        });
        console.log(`created ${demo.email} (${demo.role})`);
      }
    }
    console.log("Demo users ready. Password: lieferway");
    console.log("Restaurants were not modified.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
