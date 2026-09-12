import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { fail, options } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { ensureCustomerInvoice, pdfResponseHeaders, readInvoicePdf } from "@/lib/invoices";

export async function OPTIONS() {
  return options();
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(["CUSTOMER", "ADMIN"]);
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { id: true, customerId: true, shortCode: true, status: true, paymentStatus: true },
    });
    if (!order) return fail("Bestellung nicht gefunden.", 404);
    if (session.role !== "ADMIN" && order.customerId !== session.id) {
      return fail("Keine Berechtigung.", 403);
    }
    if (order.status === "PENDING_PAYMENT" || order.paymentStatus === "FAILED") {
      return fail("Rechnung erst nach erfolgreicher Zahlung.", 409);
    }

    const invoice = await ensureCustomerInvoice(order.id);
    const pdf = await readInvoicePdf(invoice);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: pdfResponseHeaders(`${invoice.number}.pdf`),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHENTICATED") return fail("Bitte anmelden.", 401);
    if (msg === "FORBIDDEN") return fail("Keine Berechtigung.", 403);
    console.error("customer invoice pdf", e);
    return fail("Rechnung nicht verfügbar.", 500);
  }
}
