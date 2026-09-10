import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fail, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import {
  berlinMonthKey,
  ensureCommissionInvoice,
  findInvoiceById,
  pdfResponseHeaders,
  readInvoicePdf,
} from "@/lib/invoices";
import { parseLocale } from "@/lib/i18n";

export async function OPTIONS() {
  return options();
}

export async function GET(req: Request) {
  try {
    const session = await requireSession(["RESTAURANT", "ADMIN"]);
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get("id");
    const month = url.searchParams.get("month") || berlinMonthKey();

    if (invoiceId) {
      const invoice = await findInvoiceById(invoiceId);
      if (!invoice || invoice.type !== "COMMISSION") return fail("Rechnung nicht gefunden.", 404);
      if (session.role !== "ADMIN") {
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
    }

    const restaurant =
      session.role === "ADMIN"
        ? await prisma.restaurant.findFirst({
            where: { slug: url.searchParams.get("slug") || "anadolu-grill" },
            select: { id: true },
          })
        : await prisma.restaurant.findUnique({ where: { ownerId: session.id }, select: { id: true } });
    if (!restaurant) return fail("Kein Restaurant.", 403);

    const invoice = await ensureCommissionInvoice(restaurant.id, month, parseLocale(session.locale));
    const pdf = await readInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: pdfResponseHeaders(`${invoice.number}.pdf`),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    if (msg === "BAD_PERIOD") return fail("Zeitraum ungültig.", 400);
    console.error("commission invoice pdf", e);
    return fail("Provisionsrechnung nicht verfügbar.", 500);
  }
}
