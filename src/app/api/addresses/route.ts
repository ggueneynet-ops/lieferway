import { getSession } from "@/lib/auth";
import { fail, json, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { coordsForPostal } from "@/lib/place";

export async function OPTIONS() {
  return options();
}

export async function GET() {
  const session = await getSession();
  if (!session) return json({ addresses: [] });
  const rows = await prisma.address.findMany({
    where: { userId: session.id },
    orderBy: { id: "asc" },
  });
  const addresses = rows.map((a) => {
    const coords = coordsForPostal(a.postalCode);
    return {
      id: a.id,
      label: a.label,
      street: a.street,
      postalCode: a.postalCode,
      city: a.city,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
  });
  return json({ addresses });
}
