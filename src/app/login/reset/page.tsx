"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/locale-provider";

function ResetForm() {
  const { t } = useI18n();
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (res.status === 429) {
        setError(t.passwordResetRateLimited);
        return;
      }
      if (!res.ok) {
        setError(data?.error || t.passwordResetInvalid);
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setError(t.passwordResetFailed);
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
        <Logo />
        <p className="mt-8 text-sm text-danger">{t.passwordResetInvalid}</p>
        <Link href="/login/forgot" className="mt-4 text-sm font-medium text-primary">
          {t.forgotPassword}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LanguageSwitcher />
      </div>
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">{t.resetPassword}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.resetPasswordHint}</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error ? (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
        ) : null}
        <div>
          <Label htmlFor="password">{t.newPassword}</Label>
          <Input
            id="password"
            className="mt-1 h-12 text-base"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <Button className="h-12 w-full text-base" type="submit" disabled={pending}>
          {t.saveNewPassword}
        </Button>
      </form>
      <p className="mt-6 text-sm">
        <Link href="/login" className="font-medium text-primary">
          {t.backToLogin}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
