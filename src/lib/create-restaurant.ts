import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { DEFAULT_COMMISSION_PERCENT, DEFAULT_RESTAURANT_RADIUS_KM } from "@/lib/constants";
import { CUISINE_RESTAURANT_PHOTO, DEFAULT_RESTAURANT_PHOTO } from "@/lib/media";
import { parseLogoUrl } from "@/lib/logo-upload";
import { DEFAULT_NEW_RESTAURANT_PLZS, lookupPlz } from "@/lib/plz";
import { uniqueRestaurantSlug, assertUsableSlug } from "@/lib/slug";

export { slugifyName } from "@/lib/slug";

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
  slug?: string;
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

  const requested = (input.slug ?? "").trim();
  let slug: string | undefined;
  if (requested) {
    const check = await assertUsableSlug(requested);
    if (!check.ok) {
      return {
        error:
          check.reason === "taken"
            ? "Dieser Slug ist schon vergeben."
            : "Bitte einen gültigen Slug (klein, Bindestriche).",
      };
    }
    slug = check.slug;
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

      const postalCode = (input.postalCode ?? "").replace(/\D/g, "").slice(0, 5) || "";
      const place = lookupPlz(postalCode) ?? null;
      const address = (input.address ?? "").trim() || postalCode;
      const city = (input.city ?? "").trim() || "";
      const servicePlzs = Array.from(new Set([postalCode, ...DEFAULT_NEW_RESTAURANT_PLZS]));

      const logoParsed = parseLogoUrl(input.logoUrl ?? "");
      const logoUrl = logoParsed === "invalid" ? null : logoParsed;
      const restaurantSlug = slug ?? (await uniqueRestaurantSlug(name, { city }));

      const restaurant = await tx.restaurant.create({
        data: {
          ownerId,
          name,
          slug: restaurantSlug,
          description: `${name} in ${city}.`,
          cuisine,
          address,
          city,
          postalCode,
          district: place?.district ?? "",
          lat: place?.lat ?? 50.1109,
          lng: place?.lng ?? 8.6821,
          maxDeliveryKm: DEFAULT_RESTAURANT_RADIUS_KM,
          imageUrl: CUISINE_RESTAURANT_PHOTO[cuisine] ?? DEFAULT_RESTAURANT_PHOTO,
          logoUrl,
          rating: 0,
          reviewCount: 0,
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
