/**
 * Central critical-error alerts for Lieferway ops.
 *
 * Notify ADMIN via existing transactional email
 * (`critical_payment_or_webhook_error` → EMAIL_OPS_TO) with EmailSendLog
 * idempotency, plus optional AuditLog (no separate AdminLog model).
 *
 * Never log secrets, card numbers, or passwords.
 */

export type CriticalAlertKind =
  | "stripe_webhook_failure"
  | "payment_capture_failure"
  | "refund_failure"
  | "order_creation_failure"
  | "email_provider_failure"
  | "printer_failure"
  | "database_error"
  | "public_ssr_failure";

export type AlertCriticalInput = {
  kind: CriticalAlertKind;
  /** Stable key fragment — prefixed with kind for EmailSendLog.eventKey uniqueness. */
  dedupeKey: string;
  detail: string;
  orderCode?: string;
  orderId?: string;
  restaurantId?: string;
  /** Extra non-sensitive metadata for AuditLog only. */
  metadata?: Record<string, unknown>;
  /** Default true — writes AuditLog action CRITICAL_ALERT. */
  writeAudit?: boolean;
};

const SECRET_PATTERNS: RegExp[] = [
  /\bsk_(?:live|test)_[A-Za-z0-9]+/gi,
  /\brk_(?:live|test)_[A-Za-z0-9]+/gi,
  /\bpk_(?:live|test)_[A-Za-z0-9]+/gi,
  /\bwhsec_[A-Za-z0-9]+/gi,
  /\bBearer\s+[A-Za-z0-9._\-]+/gi,
  /\b(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
  /\b(?:api[_-]?key|secret|token)\s*[:=]\s*\S+/gi,
  /\b(?:card|pan|cvv|cvc)\s*[:=]\s*\S+/gi,
  /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g,
];

/** Strip credentials / PAN-looking digits from free-form error text. */
export function sanitizeAlertDetail(raw: string, maxLen = 500): string {
  let s = String(raw ?? "").replace(/\s+/g, " ").trim();
  for (const re of SECRET_PATTERNS) {
    s = s.replace(re, "[redacted]");
  }
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s || "unknown_error";
}

export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) return sanitizeAlertDetail(err.message);
  if (typeof err === "string") return sanitizeAlertDetail(err);
  try {
    return sanitizeAlertDetail(JSON.stringify(err));
  } catch {
    return "unknown_error";
  }
}

/** Prisma / DB errors that warrant ops attention when catchable. */
export function isCriticalDatabaseError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code ?? "")
      : "";
  // Connection / engine / timeout style codes
  if (/^P10(01|02|03|08|09|10|11|12)$/.test(code)) return true;
  if (code === "P2024" || code === "P2034") return true; // timed out / write conflict
  const msg = safeErrorMessage(err).toLowerCase();
  if (msg.includes("can't reach database") || msg.includes("connection")) return true;
  if (msg.includes("timed out") || msg.includes("timeout")) return true;
  return false;
}

function kindLabel(kind: CriticalAlertKind): string {
  switch (kind) {
    case "stripe_webhook_failure":
      return "Stripe webhook failure";
    case "payment_capture_failure":
      return "Payment capture failure";
    case "refund_failure":
      return "Refund failure";
    case "order_creation_failure":
      return "Order creation failure";
    case "email_provider_failure":
      return "Email provider failure";
    case "printer_failure":
      return "Printer / Lieferbon failure";
    case "database_error":
      return "Critical database error";
    case "public_ssr_failure":
      return "Public page SSR failure";
    default:
      return "Critical error";
  }
}

/**
 * Fire an ops alert. Best-effort — never throws into the caller's happy path.
 * Dedupes via EmailSendLog eventKey = critical_payment_or_webhook_error:{kind}:{dedupeKey}.
 */
export async function alertCritical(input: AlertCriticalInput): Promise<{
  emailed: boolean;
  skipped: boolean;
  audited: boolean;
}> {
  const detail = sanitizeAlertDetail(
    `[${kindLabel(input.kind)}] ${input.detail}`,
  );
  const dedupeKey = sanitizeAlertDetail(`${input.kind}:${input.dedupeKey}`, 200);
  let emailed = false;
  let skipped = false;
  let audited = false;

  try {
    const { sendCriticalPaymentOrWebhookError } = await import("@/lib/email");
    const result = await sendCriticalPaymentOrWebhookError({
      dedupeKey,
      detail,
      orderCode: input.orderCode,
    });
    emailed = Boolean(result.ok && !result.skipped);
    skipped = Boolean(result.skipped);
  } catch (e) {
    console.error("[alerts] email failed", {
      kind: input.kind,
      dedupeKey,
      error: safeErrorMessage(e),
    });
  }

  if (input.writeAudit !== false) {
    try {
      const { writeAuditLog } = await import("@/lib/audit");
      await writeAuditLog({
        actor: null,
        action: "CRITICAL_ALERT",
        entityType: input.kind,
        entityId: input.orderId ?? input.restaurantId ?? null,
        summary: detail.slice(0, 500),
        metadata: {
          kind: input.kind,
          dedupeKey,
          orderCode: input.orderCode ?? null,
          orderId: input.orderId ?? null,
          restaurantId: input.restaurantId ?? null,
          ...(input.metadata ?? {}),
        },
      });
      audited = true;
    } catch (e) {
      console.error("[alerts] audit failed", safeErrorMessage(e));
    }
  }

  console.error("[alerts] critical", {
    kind: input.kind,
    dedupeKey,
    detail,
    emailed,
    skipped,
    audited,
  });

  return { emailed, skipped, audited };
}

/**
 * Ops hook for a public page that fell through to the Next.js global error UI.
 *
 * Deduped per route + digest so one bad deploy sends one mail instead of one per
 * visitor. `digest` is the number rendered by `src/app/global-error.tsx` and the
 * key ops searches for in Vercel Runtime Logs (docs/production-stability.md).
 */
export async function alertPublicSsrFailure(input: {
  route: string;
  error: unknown;
  digest?: string | null;
  slug?: string;
  restaurantId?: string;
}) {
  const route = sanitizeAlertDetail(input.route, 120);
  const digest = input.digest ? sanitizeAlertDetail(String(input.digest), 40) : null;
  return alertCritical({
    kind: "public_ssr_failure",
    dedupeKey: digest ? `${route}:${digest}` : route,
    detail: `${route} failed to render — ${safeErrorMessage(input.error)}`,
    restaurantId: input.restaurantId,
    metadata: { route, digest, slug: input.slug ?? null },
  });
}
