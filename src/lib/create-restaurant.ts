import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_COMMISSION_PERCENT, DEFAULT_RESTAURANT_RADIUS_KM } from "@/lib/constants";
import { CUISINE_RESTAURANT_PHOTO, DEFAULT_RESTAURANT_PHOTO } from "@/lib/media";
import { parseLogoUrl } from "@/lib/logo-upload";
import { DEFAULT_NEW_RESTAURANT_PLZS, lookupPlz } from "@/lib/plz";

export function slugifyName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "restaurant";
}

export type CreateRestaurantInput = {
  name: string;
  cuisine: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  existingOwnerId?: string;
  commissionPercent?: number;
  address?: string;
  postalCode?: string;
  city?: string;
  logoUrl?: string;
};

export type CreateRestaurantResult =
  | { error: string }
  | {
      restaurant: {
        id: string;
        name: string;
        slug: string;
        owner: { email: string; name: string };
      };
      password: string;
    };

export async function createRestaurantRecord(
  input: CreateRestaurantInput,
): Promise<CreateRestaurantResult> {
  const name = input.name.trim();
  const cuisine = input.cuisine.trim() || "Sonstiges";
  const commissionPercent = Number.isFinite(Number(input.commissionPercent))
    ? Number(input.commissionPercent)
    : DEFAULT_COMMISSION_PERCENT;

  if (name.length < 2) {
    return { error: "Bitte den Restaurantnamen ausfüllen." };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let ownerId: string;
      const password = "lieferway";

      if (input.existingOwnerId) {
        const existing = await tx.user.findUnique({ where: { id: input.existingOwnerId } });
        if (!existing) return { error: "Konto nicht gefunden." };
        if (existing.role !== "RESTAURANT" && existing.role !== "ADMIN") {
          return { error: "Kundenkonten können kein Restaurant anlegen. Nur Admin legt Betriebe an." };
        }
        const already = await tx.restaurant.findUnique({ where: { ownerId: existing.id } });
        if (already) return { error: "Dieses Konto hat schon ein Restaurant." };
        ownerId = existing.id;
      } else {
        const ownerName = (input.ownerName ?? "").trim();
        const ownerEmail = (input.ownerEmail ?? "").toLowerCase().trim();
        if (ownerName.length < 2 || !ownerEmail.includes("@")) {
          return { error: "Bitte Name, Inhaber und E-Mail ausfüllen." };
        }
        if (await tx.user.findUnique({ where: { email: ownerEmail } })) {
          return { error: "Diese E-Mail ist schon vergeben." };
        }
        const owner = await tx.user.create({
          data: {
            email: ownerEmail,
            name: ownerName,
            phone: input.ownerPhone?.trim() || null,
            passwordHash: await hashPassword(password),
            role: "RESTAURANT",
          },
        });
        ownerId = owner.id;
      }

      const postalCode = (input.postalCode ?? "").replace(/\D/g, "").slice(0, 5) || "60311";
      const place = lookupPlz(postalCode) ?? lookupPlz("60311");
      const address = (input.address ?? "").trim() || `${postalCode} Frankfurt am Main`;
      const city = (input.city ?? "").trim() || "Frankfurt am Main";
      const servicePlzs = Array.from(new Set([postalCode, ...DEFAULT_NEW_RESTAURANT_PLZS]));

      const logoParsed = parseLogoUrl(input.logoUrl ?? "");
      const logoUrl = logoParsed === "invalid" ? null : logoParsed;

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId,
          name,
          slug: `${slugifyName(name)}-${ownerId.slice(-6)}`,
          description: `${name} in ${city}.`,
          cuisine,
          address,
          city,
          postalCode,
          district: place?.district ?? "Innenstadt",
          lat: place?.lat ?? 50.1109,
          lng: place?.lng ?? 8.6821,
          maxDeliveryKm: DEFAULT_RESTAURANT_RADIUS_KM,
          imageUrl: CUISINE_RESTAURANT_PHOTO[cuisine] ?? DEFAULT_RESTAURANT_PHOTO,
          logoUrl,
          commissionPercent,
          isActive: true,
          isOpen: true,
          serviceAreas: {
            create: servicePlzs.map((code) => ({ postalCode: code })),
          },
        },
        include: { owner: { select: { email: true, name: true } } },
      });

      await tx.menuCategory.create({
        data: { restaurantId: restaurant.id, name: "Speisen", sortOrder: 0 },
      });

      return { restaurant, password };
    });
  } catch {
    return { error: "Restaurant konnte nicht angelegt werden." };
  }
}
