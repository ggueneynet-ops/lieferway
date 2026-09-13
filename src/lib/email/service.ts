import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendViaProvider } from "./provider";
import { renderTransactionalTemplate, type TemplateVars } from "./templates";
import type {
  EmailAttachment,
  SendTransactionalResult,
  TransactionalEventType,
} from "./types";

const MAX_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function newId() {
  return `e${randomBytes(12).toString("hex")}`;
}

export type SendTransactionalInput = {
  eventType: TransactionalEventType;
  /** Globally unique key — duplicate webhook must not send twice. */
  eventKey: string;
  to: string;
  vars: TemplateVars;
  attachments?: EmailAttachment[];
  metadata?: Record<string, unknown>;
};

/**
 * Central transactional send: template → provider with retries + EmailSendLog idempotency.
 * Marketing mail must NOT use this path (see docs/transactional-email.md).
 */
export async function sendTransactionalEmail(
  input: SendTransactionalInput,
): Promise<SendTransactionalResult> {
  const rendered = renderTransactionalTemplate(input.eventType, input.vars);
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  let logId: string | null = null;
  try {
    const created = await prisma.emailSendLog.create({
      data: {
        id: newId(),
        eventKey: input.eventKey,
        eventType: input.eventType,
        toEmail: input.to,
        subject: rendered.subject,
        status: "PENDING",
        attemptCount: 0,
        metadataJson,
      },
    });
    logId = created.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.includes("Unique") && !msg.includes("unique") && !msg.includes("EmailSendLog_eventKey")) {
      // Fallback: raw insert for older Prisma client shapes in long-lived workers
      try {
        const id = newId();
        await prisma.$executeRawUnsafe(
          `INSERT INTO "EmailSendLog" ("id","eventKey","eventType","toEmail","subject","status","attemptCount","metadataJson","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          id,
          input.eventKey,
          input.eventType,
          input.to,
          rendered.subject,
          "PENDING",
          0,
          metadataJson,
          new Date(),
          new Date(),
        );
        logId = id;
      } catch (rawErr) {
        const rawMsg = rawErr instanceof Error ? rawErr.message : String(rawErr);
        if (!rawMsg.includes("Unique") && !rawMsg.includes("unique")) {
          console.error("[lieferway email] log create", rawErr);
          // Still attempt send without log if DB unavailable — better than silent drop for ops? Prefer fail closed for idempotency.
          return {
            ok: false,
            skipped: false,
            mock: false,
            channel: "none",
            eventKey: input.eventKey,
            error: "email_log_unavailable",
          };
        }
      }
    }

    if (!logId) {
      const existing = await prisma.emailSendLog.findUnique({ where: { eventKey: input.eventKey } }).catch(() => null);
      if (existing?.status === "SENT" || existing?.status === "SKIPPED") {
        return {
          ok: true,
          skipped: true,
          mock: existing.provider === "console",
          channel: existing.provider ?? "unknown",
          eventKey: input.eventKey,
        };
      }
      if (existing) {
        logId = existing.id;
      } else {
        // Unique race without readable row — treat as already handled
        return {
          ok: true,
          skipped: true,
          mock: false,
          channel: "unknown",
          eventKey: input.eventKey,
        };
      }
    }
  }

  let lastError: string | undefined;
  let lastChannel = "none";
  let lastMock = false;
  let messageId: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await sendViaProvider({
      to: input.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      attachments: input.attachments,
    });
    lastChannel = result.channel;
    lastMock = result.mock;
    lastError = result.error;
    messageId = result.messageId;

    if (logId) {
      try {
        await prisma.emailSendLog.update({
          where: { id: logId },
          data: {
            attemptCount: attempt,
            provider: result.channel,
            providerMessageId: result.messageId ?? null,
            lastError: result.ok ? null : result.error ?? "send_failed",
            status: result.ok ? "SENT" : attempt >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
            sentAt: result.ok ? new Date() : undefined,
          },
        });
      } catch (updErr) {
        console.error("[lieferway email] log update", updErr);
      }
    }

    if (result.ok) {
      return {
        ok: true,
        skipped: false,
        mock: result.mock,
        channel: result.channel,
        eventKey: input.eventKey,
      };
    }

    if (attempt < MAX_ATTEMPTS) {
      await sleep(120 * 2 ** (attempt - 1));
    }
  }

  console.error("[lieferway email] provider failed after retries", {
    eventKey: input.eventKey,
    eventType: input.eventType,
    error: lastError,
    messageId,
  });

  return {
    ok: false,
    skipped: false,
    mock: lastMock,
    channel: lastChannel,
    eventKey: input.eventKey,
    error: lastError ?? "send_failed",
  };
}
