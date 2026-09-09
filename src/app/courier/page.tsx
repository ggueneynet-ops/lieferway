import { PanelShell } from "@/components/panel-shell";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CourierBoard } from "@/components/courier-board";

export default async function CourierPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const orders = await prisma.order.findMany({
    where:
      session.role === "ADMIN"
        ? { status: { in: ["READY", "OUT_FOR_DELIVERY"] } }
        : {
            OR: [
              { courierId: session.id, status: { in: ["READY", "OUT_FOR_DELIVERY"] } },
              { status: "READY", courierId: null },
            ],
          },
    include: {
      items: true,
      restaurant: { select: { name: true, address: true, postalCode: true, city: true } },
      customer: { select: { name: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <PanelShell roles={["COURIER"]} title="Kurier · Frankfurt">
      <CourierBoard initial={JSON.parse(JSON.stringify(orders))} courierId={session.id} />
    </PanelShell>
  );
}
