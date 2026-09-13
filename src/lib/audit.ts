import { prisma } from "@/lib/prisma";

export type AuditActor = {
  id?: string | null;
  email?: string | null;
} | null;

export type WriteAuditInput = {
  actor?: AuditActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
};

/** Best-effort audit write — never throws into the caller's happy path. */
export async function writeAuditLog(input: WriteAuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary.slice(0, 500),
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (e) {
    console.error("[audit] write failed", e);
  }
}
