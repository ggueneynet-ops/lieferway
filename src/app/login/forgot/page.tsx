"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleToggle } from "@/components/locale-toggle";
import { useI18n } from "@/components/locale-provider";

function ForgotForm() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 429) {
        setError(t.passwordResetRateLimited);
        return;
      }
      if (!res.ok) {
        setError(t.passwordResetFailed);
        return;
      }
      setDone(true);
    } catch {
      setError(t.passwordResetFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LocaleToggle />
      </div>
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">{t.forgotPassword}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.forgotPasswordHint}</p>
      {done ? (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.passwordResetSent}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error ? (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
          ) : null}
          <div>
            <Label htmlFor="email">{t.email}</Label>
            <Input
              id="email"
              className="mt-1 h-12 text-base"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <Button className="h-12 w-full text-base" type="submit" disabled={pending}>
            {t.requestPasswordReset}
          </Button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="font-medium text-primary">
          {t.backToLogin}
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
