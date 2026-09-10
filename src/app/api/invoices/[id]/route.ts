import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fail, options } from "@/lib/http";
import { findInvoiceById, pdfResponseHeaders, readInvoicePdf } from "@/lib/invoices";
import { prisma } from "@/lib/prisma";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["CUSTOMER", "RESTAURANT", "ADMIN"]);
    const { id } = await params;
    const invoice = await findInvoiceById(id);
    if (!invoice) return fail("Rechnung nicht gefunden.", 404);

    if (session.role === "CUSTOMER") {
      if (invoice.customerId !== session.id) return fail("Keine Berechtigung.", 403);
    } else if (session.role === "RESTAURANT") {
      const owned = await prisma.restaurant.findUnique({
        where: { ownerId: session.id },
        select: { id: true },
      });
      if (!owned || owned.id !== invoice.restaurantId) return fail("Keine Berechtigung.", 403);
    }

    const pdf = await readInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: pdfResponseHeaders(`${invoice.number}.pdf`),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    return fail("Rechnung nicht verfügbar.", 500);
  }
}
