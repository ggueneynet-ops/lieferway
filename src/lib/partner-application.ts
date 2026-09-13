import { prisma } from "@/lib/prisma";
import { createRestaurantRecord } from "@/lib/create-restaurant";
import { normalizePlz } from "@/lib/plz";
import { parseSlugInput } from "@/lib/slug";
import { sendPartnerApplicationReceived, sendPartnerApproved } from "@/lib/email";

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
  desiredSlug?: string;
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
  const city = (raw.city ?? "").trim();
  const contactName = raw.contactName.trim();
  const email = raw.email.toLowerCase().trim();
  const phone = raw.phone.trim();
  const website = raw.website?.trim() || null;
  const message = raw.message?.trim() || null;
  const desiredRaw = raw.desiredSlug?.trim() ?? "";
  let desiredSlug: string | null = null;
  if (desiredRaw) {
    const parsed = parseSlugInput(desiredRaw);
    if (!parsed) return { error: "Bitte einen gültigen Wunsch-Link (klein, Bindestriche) oder leer lassen." };
    desiredSlug = parsed;
  }

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
      desiredSlug,
      status: "PENDING",
    },
  });
  try {
    await sendPartnerApplicationReceived({
      applicationId: application.id,
      email,
      contactName,
      businessName,
    });
  } catch (mailErr) {
    console.error("partner.apply.email", mailErr);
  }
  return { application };
}

export async function approvePartnerApplication(
  id: string,
  opts?: { slug?: string },
): Promise<
  | { error: string }
  | {
      restaurant: { id: string; name: string; slug: string; owner: { email: string; name: string } };
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
    slug: (opts?.slug ?? app.desiredSlug ?? "").trim() || undefined,
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

  try {
    await sendPartnerApproved({
      applicationId: app.id,
      email: result.restaurant.owner.email,
      contactName: result.restaurant.owner.name,
      businessName: app.businessName,
      password: result.password,
    });
  } catch (mailErr) {
    console.error("partner.approve.email", mailErr);
  }

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
