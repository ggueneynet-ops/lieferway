import { prisma } from "@/lib/prisma";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { normalizePlz } from "@/lib/plz";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PartnerApplyInput = {
  businessName: string;
  cuisine: string;
  street: string;
  postalCode: string;
  city?: string;
  contactName: string;
  email: string;
  phone: string;
  website?: string;
  message?: string;
};

export function partnerWelcomeNote(opts: { businessName: string; email: string; password: string }) {
  return `Lieferway: „${opts.businessName}“ ist freigeschaltet. Partner-Login: ${opts.email} / ${opts.password}`;
}

export async function submitPartnerApplication(
  raw: PartnerApplyInput,
): Promise<{ application: { id: string } } | { error: string }> {
  const businessName = raw.businessName.trim();
  const cuisine = raw.cuisine.trim() || "Sonstiges";
  const street = raw.street.trim();
  const postalCode = normalizePlz(raw.postalCode);
  const city = (raw.city ?? "Frankfurt am Main").trim() || "Frankfurt am Main";
  const contactName = raw.contactName.trim();
  const email = raw.email.toLowerCase().trim();
  const phone = raw.phone.trim();
  const website = raw.website?.trim() || null;
  const message = raw.message?.trim() || null;

  if (businessName.length < 2 || street.length < 3 || contactName.length < 2) {
    return { error: "Bitte Betriebsname, Adresse und Ansprechpartner ausfüllen." };
  }
  if (!postalCode) return { error: "Bitte eine gültige PLZ angeben." };
  if (!EMAIL_RE.test(email)) return { error: "Bitte eine gültige E-Mail angeben." };
  if (phone.replace(/\D/g, "").length < 6) return { error: "Bitte eine Telefonnummer angeben." };

  const open = await prisma.partnerApplication.findFirst({
    where: { email, status: { in: ["PENDING", "CONTACTED"] } },
  });
  if (open) return { error: "duplicate" };

  const application = await prisma.partnerApplication.create({
    data: {
      businessName,
      cuisine,
      street,
      postalCode,
      city,
      contactName,
      email,
      phone,
      website,
      message,
      status: "PENDING",
    },
  });
  return { application };
}

export async function approvePartnerApplication(id: string): Promise<
  | { error: string }
  | {
      restaurant: { id: string; name: string; owner: { email: string; name: string } };
      password: string;
      note: string;
    }
> {
  const app = await prisma.partnerApplication.findUnique({ where: { id } });
  if (!app) return { error: "Anfrage nicht gefunden." };
  if (app.status === "APPROVED") return { error: "Diese Anfrage ist schon freigegeben." };
  if (app.status === "REJECTED") return { error: "Abgelehnte Anfragen können nicht freigegeben werden." };

  const result = await createRestaurantRecord({
    name: app.businessName,
    cuisine: app.cuisine,
    ownerName: app.contactName,
    ownerEmail: app.email,
    ownerPhone: app.phone,
    address: app.street,
    postalCode: app.postalCode,
    city: app.city,
  });
  if ("error" in result) return { error: result.error };

  const note = partnerWelcomeNote({
    businessName: app.businessName,
    email: result.restaurant.owner.email,
    password: result.password,
  });

  await prisma.partnerApplication.update({
    where: { id: app.id },
    data: {
      status: "APPROVED",
      restaurantId: result.restaurant.id,
      reviewedAt: new Date(),
      adminNote: note,
    },
  });

  return { restaurant: result.restaurant, password: result.password, note };
}

export async function setApplicationStatus(
  id: string,
  status: "CONTACTED" | "REJECTED",
): Promise<{ ok: true } | { error: string }> {
  const app = await prisma.partnerApplication.findUnique({ where: { id } });
  if (!app) return { error: "Anfrage nicht gefunden." };
  if (app.status === "APPROVED") return { error: "Freigegebene Anfragen nicht mehr ändern." };
  await prisma.partnerApplication.update({
    where: { id },
    data: { status, reviewedAt: new Date() },
  });
  return { ok: true };
}
