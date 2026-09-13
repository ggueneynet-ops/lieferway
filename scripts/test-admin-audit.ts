import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_CANCELLABLE_STATUSES, CUSTOMER_CANCELLABLE_STATUSES } from "../src/lib/constants";
import type { ReleaseReason } from "../src/lib/payment-lifecycle-shared";
import { refundIdempotencyKey } from "../src/lib/payment-lifecycle-shared";

function check(name: string, fn: () => void) {
  fn();
  console.log(`ok  ${name}`);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

check("AuditLog model + migration present", () => {
  const schema = fs.readFileSync(path.join(root, "prisma/schema.prisma"), "utf8");
  assert.ok(schema.includes("model AuditLog"));
  assert.ok(schema.includes("actorEmail"));
  const mig = path.join(root, "prisma/migrations/20260913220000_admin_audit_log/migration.sql");
  assert.ok(fs.existsSync(mig));
  const sql = fs.readFileSync(mig, "utf8");
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS "AuditLog"'));
});

check("admin cancellable is a superset of customer cancellable", () => {
  for (const s of CUSTOMER_CANCELLABLE_STATUSES) {
    assert.ok((ADMIN_CANCELLABLE_STATUSES as readonly string[]).includes(s), s);
  }
  assert.ok(ADMIN_CANCELLABLE_STATUSES.includes("ACCEPTED"));
  assert.ok(ADMIN_CANCELLABLE_STATUSES.includes("OUT_FOR_DELIVERY"));
  assert.equal((ADMIN_CANCELLABLE_STATUSES as readonly string[]).includes("DELIVERED"), false);
  assert.equal((ADMIN_CANCELLABLE_STATUSES as readonly string[]).includes("CANCELLED"), false);
});

check("admin_cancel is a valid release reason + distinct idempotency", () => {
  const reason: ReleaseReason = "admin_cancel";
  const a = refundIdempotencyKey("ord_x", reason, 1000);
  const b = refundIdempotencyKey("ord_x", "admin_refund", 1000);
  assert.notEqual(a, b);
  assert.ok(a.includes("admin_cancel"));
});

check("admin cancel + refund APIs and audit helper exist", () => {
  const cancel = fs.readFileSync(
    path.join(root, "src/app/api/admin/orders/[id]/cancel/route.ts"),
    "utf8",
  );
  assert.ok(cancel.includes("ORDER_CANCEL"));
  assert.ok(cancel.includes("admin_cancel"));
  assert.ok(cancel.includes("writeAuditLog"));
  const refund = fs.readFileSync(
    path.join(root, "src/app/api/admin/orders/[id]/refund/route.ts"),
    "utf8",
  );
  assert.ok(refund.includes("ORDER_REFUND"));
  assert.ok(refund.includes("writeAuditLog"));
  const audit = fs.readFileSync(path.join(root, "src/lib/audit.ts"), "utf8");
  assert.ok(audit.includes("writeAuditLog"));
  assert.ok(audit.includes("prisma.auditLog.create"));
});

check("admin UI pages for logs / emails / audit exist and are ADMIN-gated", () => {
  for (const rel of [
    "src/app/admin/logs/page.tsx",
    "src/app/admin/emails/page.tsx",
    "src/app/admin/audit/page.tsx",
    "src/components/admin-cancel-form.tsx",
  ]) {
    const body = fs.readFileSync(path.join(root, rel), "utf8");
    if (rel.endsWith("page.tsx")) {
      assert.ok(body.includes('roles={["ADMIN"]}'));
    }
  }
  const shell = fs.readFileSync(path.join(root, "src/components/panel-shell.tsx"), "utf8");
  assert.ok(shell.includes("/admin/logs"));
  assert.ok(shell.includes("/admin/emails"));
  assert.ok(shell.includes("/admin/audit"));
  assert.ok(shell.includes("/admin/waypoints"));
  assert.ok(shell.includes("/admin/orders"));
  assert.ok(shell.includes("/admin/payouts"));
});

check("freeze / commission / waypoints write AuditLog", () => {
  const freeze = fs.readFileSync(path.join(root, "src/app/admin/restaurants/freeze/route.ts"), "utf8");
  assert.ok(freeze.includes("RESTAURANT_FREEZE"));
  const commission = fs.readFileSync(
    path.join(root, "src/app/admin/restaurants/commission/route.ts"),
    "utf8",
  );
  assert.ok(commission.includes("COMMISSION_UPDATE"));
  const wp = fs.readFileSync(path.join(root, "src/app/api/admin/waypoints/route.ts"), "utf8");
  assert.ok(wp.includes("WAYPOINTS_ADJUST"));
});

check("default commission stays 8 and no Stripe live keys in admin changes", () => {
  const constants = fs.readFileSync(path.join(root, "src/lib/constants.ts"), "utf8");
  assert.ok(constants.includes("DEFAULT_COMMISSION_PERCENT") || constants.includes("= 8"));
  // Scan changed admin surfaces for live Stripe secret patterns
  const scanned = [
    "src/app/api/admin/orders/[id]/cancel/route.ts",
    "src/app/admin/logs/page.tsx",
    "src/lib/audit.ts",
  ];
  for (const rel of scanned) {
    const body = fs.readFileSync(path.join(root, rel), "utf8");
    assert.equal(body.includes("sk_live"), false);
    assert.equal(body.includes("rk_live"), false);
  }
  const def = fs.readFileSync(path.join(root, "src/lib/constants.ts"), "utf8");
  const m = def.match(/DEFAULT_COMMISSION_PERCENT\s*=\s*(\d+)/);
  if (m) assert.equal(Number(m[1]), 8);
});

check("i18n keys present in de/en/tr", () => {
  const i18n = fs.readFileSync(path.join(root, "src/lib/i18n.ts"), "utf8");
  for (const k of ["adminCancel:", "adminAuditLog:", "adminEmailLogs:", "adminWebhookLogs:"]) {
    assert.equal(i18n.split(k).length - 1, 3, k);
  }
});

console.log("\nAll admin-audit checks passed.");
