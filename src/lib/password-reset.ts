import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendPasswordReset } from "@/lib/email";

export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
export const PASSWORD_RESET_TOKEN_BYTES = 32;

export function hashPasswordResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function mintPasswordResetToken() {
  return randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("base64url");
}

/**
 * Always succeeds from the caller's perspective (no email enumeration).
 * Invalidates prior unused tokens for the user.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{ ok: true }> {
  const email = emailRaw.toLowerCase().trim();
  if (!email.includes("@")) return { ok: true };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, locale: true },
  });
  if (!user) return { ok: true };

  const rawToken = mintPasswordResetToken();
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const locale = user.locale === "en" || user.locale === "tr" ? user.locale : "de";
  await sendPasswordReset({
    userId: user.id,
    email: user.email,
    name: user.name,
    token: rawToken,
    locale,
  });

  return { ok: true };
}

export async function consumePasswordResetToken(opts: {
  rawToken: string;
  newPassword: string;
}): Promise<{ ok: true } | { error: string; status: number }> {
  const rawToken = opts.rawToken.trim();
  if (rawToken.length < 20) return { error: "Link ungültig oder abgelaufen.", status: 400 };
  if (opts.newPassword.length < 6) {
    return { error: "Passwort mindestens 6 Zeichen.", status: 400 };
  }

  const tokenHash = hashPasswordResetToken(rawToken);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { error: "Link ungültig oder abgelaufen.", status: 400 };
  }

  const passwordHash = await hashPassword(opts.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this user.
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
