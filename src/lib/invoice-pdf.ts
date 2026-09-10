import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatEUR } from "@/lib/money";
import { LIEFERWAY_ISSUER, VAT_DELIVERY, VAT_FOOD, vatIncluded } from "@/lib/legal-entity";
import { formatBerlinInvoiceDate } from "@/lib/datetime";
import { interpolate, t as dict, type Locale } from "@/lib/i18n";

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 50;
const PINK = rgb(0.91, 0.12, 0.39);
const INK = rgb(0.07, 0.09, 0.15);
const MUTED = rgb(0.42, 0.45, 0.5);

export type CustomerInvoicePdfInput = {
  number: string;
  locale: Locale;
  issuedAt: Date;
  shortCode: string;
  restaurantName: string;
  paymentLabel: string;
  customerName: string;
  street: string;
  postalCode: string;
  city: string;
  items: { name: string; quantity: number; priceCents: number }[];
  foodSubtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  couponCode?: string | null;
  totalCents: number;
};

export type CommissionInvoicePdfInput = {
  number: string;
  locale: Locale;
  issuedAt: Date;
  periodLabel: string;
  restaurantName: string;
  restaurantAddress: string;
  restaurantPostalCode: string;
  restaurantCity: string;
  orderCount: number;
  gmvFoodCents: number;
  commissionPercent: number;
  commissionCents: number;
  netPayoutCents: number;
};

function pdfSafe(value: string) {
  return value
    .replaceAll("ğ", "g")
    .replaceAll("Ğ", "G")
    .replaceAll("ş", "s")
    .replaceAll("Ş", "S")
    .replaceAll("ı", "i")
    .replaceAll("İ", "I")
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("„", '"')
    .replaceAll("’", "'")
    .replaceAll("\u00a0", " ")
    .replaceAll("\u202f", " ")
    .replaceAll("\u2009", " ");
}

class PdfWriter {
  y: number;
  constructor(
    readonly page: PDFPage,
    readonly font: PDFFont,
    readonly bold: PDFFont,
    readonly width: number,
  ) {
    this.y = 792;
  }

  text(value: string, opts?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number }) {
    const size = opts?.size ?? 10;
    const font = opts?.bold ? this.bold : this.font;
    this.page.drawText(pdfSafe(value), {
      x: opts?.x ?? MARGIN,
      y: this.y,
      size,
      font,
      color: opts?.color ?? INK,
    });
    this.y -= size + 4;
  }

  wrap(value: string, opts?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; width?: number }) {
    const size = opts?.size ?? 10;
    const font = opts?.bold ? this.bold : this.font;
    const max = opts?.width ?? this.width - MARGIN * 2;
    const words = pdfSafe(value).split(/\s+/);
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > max && line) {
        this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color: opts?.color ?? INK });
        this.y -= size + 3;
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font, color: opts?.color ?? INK });
      this.y -= size + 4;
    }
  }

  gap(px = 8) {
    this.y -= px;
  }

  rule() {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 6 },
      end: { x: this.width - MARGIN, y: this.y + 6 },
      thickness: 0.6,
      color: rgb(0.9, 0.9, 0.92),
    });
    this.y -= 8;
  }

  pair(left: string, right: string, opts?: { bold?: boolean; size?: number }) {
    const size = opts?.size ?? 10;
    const font = opts?.bold ? this.bold : this.font;
    const safeRight = pdfSafe(right);
    const rw = font.widthOfTextAtSize(safeRight, size);
    this.page.drawText(pdfSafe(left), { x: MARGIN, y: this.y, size, font, color: INK });
    this.page.drawText(safeRight, {
      x: this.width - MARGIN - rw,
      y: this.y,
      size,
      font,
      color: INK,
    });
    this.y -= size + 5;
  }
}

function header(w: PdfWriter, title: string, number: string, date: string, locale: Locale) {
  const t = dict(locale);
  w.page.drawRectangle({ x: 0, y: 828, width: A4[0], height: 14, color: PINK });
  w.text("Lieferway", { size: 11, bold: true, color: PINK });
  w.gap(4);
  w.text(title, { size: 22, bold: true });
  w.text(`${number}  ·  ${date}`, { size: 10, color: MUTED });
  w.gap(4);
  w.wrap(t.invoiceIssuerNote, { size: 8, color: MUTED });
  w.rule();
}

function issuerBlock(w: PdfWriter, locale: Locale) {
  const t = dict(locale);
  w.text(t.invoiceSeller, { size: 8, bold: true, color: MUTED });
  w.text(LIEFERWAY_ISSUER.name, { size: 11, bold: true });
  w.text(`${LIEFERWAY_ISSUER.street}`, { size: 10 });
  w.text(`${LIEFERWAY_ISSUER.postalCode} ${LIEFERWAY_ISSUER.city}`, { size: 10 });
  w.text(`USt-IdNr.: ${LIEFERWAY_ISSUER.vatId} (${t.invoicePlaceholder})`, { size: 9, color: MUTED });
  w.gap(6);
}

export async function buildCustomerInvoicePdf(input: CustomerInvoicePdfInput): Promise<Uint8Array> {
  const t = dict(input.locale);
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new PdfWriter(page, font, bold, A4[0]);
  const date = formatBerlinInvoiceDate(input.issuedAt, input.locale);

  header(w, t.invoice, input.number, date, input.locale);
  issuerBlock(w, input.locale);

  w.text(t.invoiceBuyer, { size: 8, bold: true, color: MUTED });
  w.text(input.customerName, { size: 11, bold: true });
  w.text(input.street, { size: 10 });
  w.text(`${input.postalCode} ${input.city}`, { size: 10 });
  w.gap(8);

  w.pair(t.invoiceOrder, input.shortCode, { bold: true, size: 11 });
  w.pair("Restaurant", input.restaurantName);
  w.pair(t.bonPay, input.paymentLabel);
  w.gap(4);
  w.rule();

  w.text(t.bonItems, { size: 8, bold: true, color: MUTED });
  for (const item of input.items) {
    const line = `${item.quantity}x  ${item.name}`;
    w.pair(line, formatEUR(item.priceCents * item.quantity, input.locale));
  }
  w.gap(4);
  w.pair(t.subtotal, formatEUR(input.foodSubtotalCents, input.locale));
  if (input.discountCents > 0) {
    w.pair(
      `${t.discount}${input.couponCode ? ` ${input.couponCode}` : ""}`,
      `-${formatEUR(input.discountCents, input.locale)}`,
    );
  }
  w.pair(t.fee, formatEUR(input.deliveryFeeCents, input.locale));
  w.rule();
  w.pair(t.invoiceTotal, formatEUR(input.totalCents, input.locale), { bold: true, size: 13 });
  w.gap(10);

  const foodGross = Math.max(0, input.foodSubtotalCents - input.discountCents);
  const foodVat = vatIncluded(foodGross, VAT_FOOD);
  const feeVat = vatIncluded(input.deliveryFeeCents, VAT_DELIVERY);
  w.text(t.invoiceVatHeading, { size: 8, bold: true, color: MUTED });
  w.pair(interpolate(t.invoiceVatFood, { rate: "7" }), formatEUR(foodVat.vatCents, input.locale));
  w.pair(interpolate(t.invoiceVatDelivery, { rate: "19" }), formatEUR(feeVat.vatCents, input.locale));
  w.wrap(t.invoiceVatNote, { size: 8, color: MUTED });
  w.gap(10);
  w.wrap(t.invoiceNotBon, { size: 8, color: MUTED });
  w.wrap(t.eInvoiceComing, { size: 8, color: MUTED });

  doc.setTitle(`${t.invoice} ${input.number}`);
  doc.setAuthor(LIEFERWAY_ISSUER.name);
  return doc.save();
}

export async function buildCommissionInvoicePdf(input: CommissionInvoicePdfInput): Promise<Uint8Array> {
  const t = dict(input.locale);
  const doc = await PDFDocument.create();
  const page = doc.addPage(A4);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new PdfWriter(page, font, bold, A4[0]);
  const date = formatBerlinInvoiceDate(input.issuedAt, input.locale);

  header(w, t.commissionInvoiceDraft, input.number, date, input.locale);
  issuerBlock(w, input.locale);

  w.text(t.invoiceBuyer, { size: 8, bold: true, color: MUTED });
  w.text(input.restaurantName, { size: 11, bold: true });
  w.text(input.restaurantAddress, { size: 10 });
  w.text(`${input.restaurantPostalCode} ${input.restaurantCity}`, { size: 10 });
  w.gap(8);

  w.pair(t.commissionPeriod, input.periodLabel, { bold: true });
  w.pair(t.commissionOrders, String(input.orderCount));
  w.gap(4);
  w.rule();
  w.pair(t.commissionGmv, formatEUR(input.gmvFoodCents, input.locale));
  w.pair(
    interpolate(t.commissionRateLine, { percent: String(input.commissionPercent) }),
    formatEUR(input.commissionCents, input.locale),
  );
  w.rule();
  w.pair(t.commissionNet, formatEUR(input.netPayoutCents, input.locale), { bold: true, size: 13 });
  w.gap(12);
  w.wrap(t.commissionInvoiceHint, { size: 8, color: MUTED });
  w.wrap(t.eInvoiceComingHint, { size: 8, color: MUTED });

  doc.setTitle(`${t.commissionInvoice} ${input.number}`);
  doc.setAuthor(LIEFERWAY_ISSUER.name);
  return doc.save();
}
