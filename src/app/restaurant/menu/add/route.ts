import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eurosToCents } from "@/lib/money";
import { dishPhoto } from "@/lib/media";

function redirectTo(path: string) {
  revalidatePath("/restaurant/menu");
  revalidatePath("/");
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

async function ownedRestaurant(userId: string, role: string) {
  if (role === "ADMIN") return prisma.restaurant.findFirst();
  return prisma.restaurant.findUnique({ where: { ownerId: userId } });
}

export async function POST(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const restaurant = await ownedRestaurant(session.id, session.role);
    if (!restaurant) return redirectTo("/restaurant/menu");

    const form = await req.formData();
    const name = String(form.get("name") ?? "").trim();
    const priceCents = eurosToCents(String(form.get("price") ?? ""));
    const categoryName = String(form.get("categoryName") ?? "").trim();
    let categoryId = String(form.get("categoryId") ?? "");
    const imageRaw = String(form.get("imageUrl") ?? "").trim();

    if (name.length < 2 || priceCents <= 0) {
      return redirectTo("/restaurant/menu?error=" + encodeURIComponent("Name und Preis prüfen."));
    }

    if (categoryName) {
      const category = await prisma.menuCategory.create({
        data: { restaurantId: restaurant.id, name: categoryName, sortOrder: 99 },
      });
      categoryId = category.id;
    }
    if (!categoryId) {
      return redirectTo("/restaurant/menu?error=" + encodeURIComponent("Bitte eine Kategorie wählen."));
    }

    const imageUrl =
      imageRaw && (imageRaw.startsWith("/") || imageRaw.startsWith("http"))
        ? imageRaw
        : dishPhoto(null, restaurant.cuisine, name);

    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId,
        name,
        description: "",
        priceCents,
        imageUrl,
        isAvailable: true,
      },
    });
    return redirectTo("/restaurant/menu?ok=1");
  } catch {
    return redirectTo("/login?next=/restaurant/menu");
  }
}
