import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_COMMISSION_PERCENT, DEFAULT_RESTAURANT_RADIUS_KM } from "@/lib/constants";
import { CUISINE_RESTAURANT_PHOTO, DEFAULT_RESTAURANT_PHOTO } from "@/lib/media";
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
  existingOwnerId?: string;
  commissionPercent?: number;
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
            passwordHash: await hashPassword(password),
            role: "RESTAURANT",
          },
        });
        ownerId = owner.id;
      }

      const place = lookupPlz("60311");
      const restaurant = await tx.restaurant.create({
        data: {
          ownerId,
          name,
          slug: `${slugifyName(name)}-${ownerId.slice(-6)}`,
          description: `${name} in Frankfurt am Main.`,
          cuisine,
          address: "Frankfurt am Main",
          postalCode: "60311",
          district: place?.district ?? "Innenstadt",
          lat: place?.lat ?? 50.1109,
          lng: place?.lng ?? 8.6821,
          maxDeliveryKm: DEFAULT_RESTAURANT_RADIUS_KM,
          imageUrl: CUISINE_RESTAURANT_PHOTO[cuisine] ?? DEFAULT_RESTAURANT_PHOTO,
          commissionPercent,
          isActive: true,
          isOpen: true,
          serviceAreas: {
            create: DEFAULT_NEW_RESTAURANT_PLZS.map((postalCode) => ({ postalCode })),
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
