import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseLocale, t as tDict, type Locale } from "@/lib/i18n";
import { bonPayLabel } from "@/lib/bon";
import { buildCommissionInvoicePdf, buildCustomerInvoicePdf } from "@/lib/invoice-pdf";
import { restaurantReportTotals, resolveReportRange, startOfBerlinMonth, berlinYmd, addDaysYmd } from "@/lib/restaurant-reports";

export const INVOICE_CUSTOMER = "CUSTOMER_ORDER";
export const INVOICE_COMMISSION = "COMMISSION";

const ROOT = () => path.join(process.cwd(), "data", "invoices");

function invoiceId() {
  return `inv${randomBytes(12).toString("hex")}`;
}

export type StoredInvoice = {
  id: string;
  type: string;
  status: string;
  number: string;
  orderId: string | null;
  restaurantId: string | null;
  customerId: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  pdfPath: string;
  totalCents: number;
  locale: string;
  createdAt: Date;
};

function rowToInvoice(row: Record<string, unknown>): StoredInvoice {
  return {
    id: String(row.id),
    type: String(row.type),
    status: String(row.status),
    number: String(row.number),
    orderId: (row.orderId as string | null) ?? null,
    restaurantId: (row.restaurantId as string | null) ?? null,
    customerId: (row.customerId as string | null) ?? null,
    periodStart: row.periodStart ? new Date(row.periodStart as string | number | Date) : null,
    periodEnd: row.periodEnd ? new Date(row.periodEnd as string | number | Date) : null,
    pdfPath: String(row.pdfPath),
    totalCents: Number(row.totalCents ?? 0),
    locale: String(row.locale ?? "de"),
    createdAt: new Date(row.createdAt as string | number | Date),
  };
}

async function insertInvoice(data: StoredInvoice) {
  try {
    await prisma.invoice.create({
      data: {
        id: data.id,
        type: data.type,
        status: data.status,
        number: data.number,
        orderId: data.orderId,
        restaurantId: data.restaurantId,
        customerId: data.customerId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        pdfPath: data.pdfPath,
        totalCents: data.totalCents,
        locale: data.locale,
        createdAt: data.createdAt,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) throw e;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "Invoice" ("id","type","status","number","orderId","restaurantId","customerId","periodStart","periodEnd","pdfPath","totalCents","locale","createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      data.id,
      data.type,
      data.status,
      data.number,
      data.orderId,
      data.restaurantId,
      data.customerId,
      data.periodStart,
      data.periodEnd,
      data.pdfPath,
      data.totalCents,
      data.locale,
      data.createdAt,
    );
  }
}

async function findCustomerInvoice(orderId: string): Promise<StoredInvoice | null> {
  try {
    const row = await prisma.invoice.findFirst({ where: { orderId, type: INVOICE_CUSTOMER } });
    return row ? rowToInvoice(row) : null;
  } catch {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "Invoice" WHERE "orderId" = $1 AND "type" = $2 LIMIT 1`,
      orderId,
      INVOICE_CUSTOMER,
    );
    return rows[0] ? rowToInvoice(rows[0]) : null;
  }
}

async function findInvoiceByNumber(number: string): Promise<StoredInvoice | null> {
  try {
    const row = await prisma.invoice.findUnique({ where: { number } });
    return row ? rowToInvoice(row) : null;
  } catch {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "Invoice" WHERE "number" = $1 LIMIT 1`,
      number,
    );
    return rows[0] ? rowToInvoice(rows[0]) : null;
  }
}

export async function findInvoiceById(id: string): Promise<StoredInvoice | null> {
  try {
    const row = await prisma.invoice.findUnique({ where: { id } });
    return row ? rowToInvoice(row) : null;
  } catch {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM "Invoice" WHERE "id" = $1 LIMIT 1`,
      id,
    );
    return rows[0] ? rowToInvoice(rows[0]) : null;
  }
}

export async function listCommissionInvoices(restaurantId?: string): Promise<StoredInvoice[]> {
  try {
    const rows = await prisma.invoice.findMany({
      where: { type: INVOICE_COMMISSION, ...(restaurantId ? { restaurantId } : {}) },
      orderBy: { periodStart: "desc" },
      take: 24,
    });
    return rows.map((r) => rowToInvoice(r));
  } catch {
    const sql = restaurantId
      ? `SELECT * FROM "Invoice" WHERE "type" = $1 AND "restaurantId" = $2 ORDER BY "periodStart" DESC LIMIT 24`
      : `SELECT * FROM "Invoice" WHERE "type" = $1 ORDER BY "periodStart" DESC LIMIT 24`;
    const rows = restaurantId
      ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, INVOICE_COMMISSION, restaurantId)
      : await prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql, INVOICE_COMMISSION);
    return rows.map(rowToInvoice);
  }
}

export async function readInvoicePdf(invoice: StoredInvoice): Promise<Buffer> {
  const abs = path.isAbsolute(invoice.pdfPath)
    ? invoice.pdfPath
    : path.join(process.cwd(), invoice.pdfPath);
  return readFile(abs);
}

async function writePdf(relDir: string, filename: string, bytes: Uint8Array) {
  const dir = path.join(ROOT(), relDir);
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, filename);
  await writeFile(abs, bytes);
  return path.relative(process.cwd(), abs).replaceAll("\\", "/");
}

async function updateInvoice(id: string, data: { status: string; pdfPath: string; totalCents: number }) {
  try {
    await prisma.invoice.update({
      where: { id },
      data: { status: data.status, pdfPath: data.pdfPath, totalCents: data.totalCents },
    });
  } catch {
    await prisma.$executeRawUnsafe(
      `UPDATE "Invoice" SET "status" = $1, "pdfPath" = $2, "totalCents" = $3 WHERE "id" = $4`,
      data.status,
      data.pdfPath,
      data.totalCents,
      id,
    );
  }
}

export async function ensureCustomerInvoice(orderId: string): Promise<StoredInvoice> {
  const existing = await findCustomerInvoice(orderId);
  if (existing) return existing;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: { select: { id: true, name: true, locale: true } },
      restaurant: { select: { id: true, name: true } },
    },
  });
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const locale = parseLocale(order.customer.locale);
  const number = `RE-${order.shortCode}`;
  const pdfBytes = await buildCustomerInvoicePdf({
    number,
    locale,
    issuedAt: order.createdAt,
    shortCode: order.shortCode,
    restaurantName: order.restaurant.name,
    paymentLabel: bonPayLabel(order.paymentMethod, tDict(locale)),
    customerName: order.customer.name,
    street: order.street,
    postalCode: order.postalCode,
    city: order.city,
    items: order.items,
    foodSubtotalCents: order.foodSubtotalCents,
    deliveryFeeCents: order.deliveryFeeCents,
    discountCents: order.discountCents,
    couponCode: order.couponCode,
    totalCents: order.totalCents,
    fulfillmentType: order.fulfillmentType,
  });
  const pdfPath = await writePdf("customer", `${number}.pdf`, pdfBytes);
  const record: StoredInvoice = {
    id: invoiceId(),
    type: INVOICE_CUSTOMER,
    status: "ISSUED",
    number,
    orderId: order.id,
    restaurantId: order.restaurantId,
    customerId: order.customer.id,
    periodStart: null,
    periodEnd: null,
    pdfPath,
    totalCents: order.totalCents,
    locale,
    createdAt: new Date(),
  };
  try {
    await insertInvoice(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const again = await findCustomerInvoice(orderId);
      if (again) return again;
    }
    throw e;
  }
  return record;
}

export function berlinMonthKey(date = new Date()): string {
  return berlinYmd(date).slice(0, 7);
}

export function isBerlinMonthOpen(yyyyMm: string, date = new Date()) {
  return yyyyMm === berlinMonthKey(date);
}

export function monthRange(yyyyMm: string) {
  if (!/^\d{4}-\d{2}$/.test(yyyyMm)) throw new Error("BAD_PERIOD");
  const fromYmd = `${yyyyMm}-01`;
  const nextMonth = addDaysYmd(fromYmd, 32).slice(0, 7);
  const toYmd = addDaysYmd(`${nextMonth}-01`, -1);
  const range = resolveReportRange("custom", fromYmd, toYmd);
  return { fromYmd, toYmd, from: range.from!, to: range.to!, key: yyyyMm };
}

/**
 * TODO(tax/invoice): Speisen-GMV minus Provision only. Does not apply refunds,
 * Gutschein/WayPoints funding, USt, reverse charge, or ZUGFeRD/XRechnung.
 * Not a legal Steuerrechnung — settlement snapshot for the restaurant.
 */
export async function ensureCommissionInvoice(
  restaurantId: string,
  yyyyMm: string,
  locale: Locale = "de",
): Promise<StoredInvoice> {
  const period = monthRange(yyyyMm);
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) throw new Error("RESTAURANT_NOT_FOUND");
  const number = `PR-${restaurant.slug}-${yyyyMm}`;
  const existing = await findInvoiceByNumber(number);
  const totals = await restaurantReportTotals(restaurantId, { from: period.from, to: period.to });
  const net = totals.foodCents - totals.commissionCents;
  const draft = isBerlinMonthOpen(yyyyMm);
  const pdfBytes = await buildCommissionInvoicePdf({
    number,
    locale,
    issuedAt: new Date(),
    periodLabel: `${period.fromYmd} – ${period.toYmd}`,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    restaurantPostalCode: restaurant.postalCode,
    restaurantCity: restaurant.city,
    orderCount: totals.orderCount,
    gmvFoodCents: totals.foodCents,
    commissionPercent: restaurant.commissionPercent,
    commissionCents: totals.commissionCents,
    netPayoutCents: net,
    draft,
  });
  const pdfPath = await writePdf("commission", `${number}.pdf`, pdfBytes);
  const status = draft ? "DRAFT" : "ISSUED";
  if (existing) {
    await updateInvoice(existing.id, { status, pdfPath, totalCents: totals.commissionCents });
    return { ...existing, status, pdfPath, totalCents: totals.commissionCents };
  }
  const record: StoredInvoice = {
    id: invoiceId(),
    type: INVOICE_COMMISSION,
    status,
    number,
    orderId: null,
    restaurantId: restaurant.id,
    customerId: null,
    periodStart: period.from,
    periodEnd: period.to,
    pdfPath,
    totalCents: totals.commissionCents,
    locale,
    createdAt: new Date(),
  };
  try {
    await insertInvoice(record);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const again = await findInvoiceByNumber(number);
      if (again) return again;
    }
    throw e;
  }
  return record;
}

export function recentMonthKeys(count = 4): string[] {
  const keys: string[] = [];
  let ymd = startOfBerlinMonth(berlinYmd());
  for (let i = 0; i < count; i++) {
    keys.push(ymd.slice(0, 7));
    ymd = startOfBerlinMonth(addDaysYmd(ymd, -1));
  }
  return keys;
}

export function pdfResponseHeaders(filename: string) {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "private, no-store",
  };
}
