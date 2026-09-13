import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TRANSACTIONAL_EVENTS } from "../src/lib/email/types";
import { EMAIL_EVENT_REGISTRY } from "../src/lib/email/registry";
import { orderStatusToEvent, renderTransactionalTemplate } from "../src/lib/email/templates";
import { resolveEmailProvider } from "../src/lib/email/provider";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("all required transactional events are registered", () => {
  const required = [
    "user_registered",
    "email_verification",
    "password_reset",
    "order_created",
    "order_accepted",
    "order_rejected",
    "order_cancelled",
    "order_refunded",
    "payment_failed",
    "order_ready",
    "order_out_for_delivery",
    "order_completed",
    "partner_application_received",
    "partner_approved",
    "restaurant_payout_summary",
    "critical_payment_or_webhook_error",
  ];
  for (const e of required) {
    assert.ok((TRANSACTIONAL_EVENTS as readonly string[]).includes(e), e);
    assert.ok(EMAIL_EVENT_REGISTRY[e as keyof typeof EMAIL_EVENT_REGISTRY], e);
  }
});

check("wired vs todo split documented in registry", () => {
  assert.equal(EMAIL_EVENT_REGISTRY.user_registered.status, "wired");
  assert.equal(EMAIL_EVENT_REGISTRY.order_created.status, "wired");
  assert.equal(EMAIL_EVENT_REGISTRY.payment_failed.status, "wired");
  assert.equal(EMAIL_EVENT_REGISTRY.partner_approved.status, "wired");
  assert.equal(EMAIL_EVENT_REGISTRY.email_verification.status, "todo");
  assert.equal(EMAIL_EVENT_REGISTRY.password_reset.status, "wired");
  assert.equal(EMAIL_EVENT_REGISTRY.restaurant_payout_summary.status, "todo");
});

check("order status maps to events", () => {
  assert.equal(orderStatusToEvent("PLACED"), "order_created");
  assert.equal(orderStatusToEvent("ACCEPTED"), "order_accepted");
  assert.equal(orderStatusToEvent("PREPARING"), "order_accepted");
  assert.equal(orderStatusToEvent("REJECTED"), "order_rejected");
  assert.equal(orderStatusToEvent("CANCELLED"), "order_cancelled");
  assert.equal(orderStatusToEvent("READY"), "order_ready");
  assert.equal(orderStatusToEvent("OUT_FOR_DELIVERY"), "order_out_for_delivery");
  assert.equal(orderStatusToEvent("DELIVERED"), "order_completed");
  assert.equal(orderStatusToEvent("PENDING_PAYMENT"), null);
});

check("templates are branded HTML without demo/test wording", () => {
  for (const eventType of TRANSACTIONAL_EVENTS) {
    const rendered = renderTransactionalTemplate(eventType, {
      locale: "de",
      name: "Jonas",
      restaurant: "Pizza Haus",
      orderCode: "AB12",
      prepMinutes: 20,
      link: "https://app.lieferway.de/orders/x",
      businessName: "Pizza Haus",
      email: "owner@example.com",
      password: "temp-pass",
      amountLabel: "12,50 €",
      detail: "detail line",
    });
    assert.ok(rendered.subject.length > 0, eventType);
    assert.ok(rendered.html.includes("Lieferway"), eventType);
    assert.ok(rendered.html.includes("viewport"), eventType);
    assert.ok(!/demo|testmodus|test mode/i.test(rendered.html), `${eventType} html`);
    assert.ok(!/demo|testmodus|test mode/i.test(rendered.text), `${eventType} text`);
  }
});

check("provider defaults to console without keys", () => {
  const prev = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    MAIL_WEBHOOK_URL: process.env.MAIL_WEBHOOK_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };
  delete process.env.EMAIL_PROVIDER;
  delete process.env.RESEND_API_KEY;
  delete process.env.SMTP_HOST;
  delete process.env.MAIL_WEBHOOK_URL;
  assert.equal(resolveEmailProvider(), "console");
  process.env.EMAIL_PROVIDER = "console";
  assert.equal(resolveEmailProvider(), "console");
  process.env.EMAIL_PROVIDER = "resend";
  process.env.RESEND_API_KEY = "re_test";
  assert.equal(resolveEmailProvider(), "resend");
  for (const [k, v] of Object.entries(prev)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

check("central module exists; components do not call Resend directly", () => {
  assert.ok(fs.existsSync(path.join(root, "src/lib/email/service.ts")));
  assert.ok(fs.existsSync(path.join(root, "src/lib/email/templates/index.ts")));
  assert.ok(fs.existsSync(path.join(root, "docs/transactional-email.md")));
  assert.ok(fs.existsSync(path.join(root, "prisma/migrations/20260913210000_email_send_log/migration.sql")));
  const components = path.join(root, "src/components");
  const walk = (dir: string): string[] => {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) out.push(...walk(full));
      else if (ent.name.endsWith(".tsx") || ent.name.endsWith(".ts")) out.push(full);
    }
    return out;
  };
  for (const file of walk(components)) {
    const src = fs.readFileSync(file, "utf8");
    assert.equal(src.includes("api.resend.com"), false, file);
    assert.equal(src.includes("sendTransactionalEmail"), false, file);
  }
});

check("schema includes EmailSendLog unique eventKey", () => {
  const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  assert.ok(schema.includes("model EmailSendLog"));
  assert.ok(schema.includes('eventKey'));
  assert.ok(/model EmailSendLog[\s\S]*?eventKey\s+String\s+@unique/.test(schema));
});

check("notify-customer uses central email events", () => {
  const notify = fs.readFileSync(path.join(root, "src/lib/notify-customer.ts"), "utf8");
  assert.ok(notify.includes("sendOrderStatusEmail"));
  assert.ok(notify.includes("orderStatusToEvent"));
  assert.equal(notify.includes('from "@/lib/mail"'), false);
});

check("auth register + partner + stripe wire senders", () => {
  const reg = fs.readFileSync(path.join(root, "src/app/api/auth/register/route.ts"), "utf8");
  assert.ok(reg.includes("sendUserRegistered"));
  const partner = fs.readFileSync(path.join(root, "src/lib/partner-application.ts"), "utf8");
  assert.ok(partner.includes("sendPartnerApplicationReceived"));
  assert.ok(partner.includes("sendPartnerApproved"));
  const stripe = fs.readFileSync(path.join(root, "src/lib/stripe-webhooks.ts"), "utf8");
  assert.ok(stripe.includes("sendPaymentFailed"));
  assert.ok(stripe.includes("sendOrderRefunded"));
  assert.ok(stripe.includes("sendCriticalPaymentOrWebhookError"));
});

console.log("\nAll email system checks passed.");
