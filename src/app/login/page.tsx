"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocaleToggle } from "@/components/locale-toggle";
import { useI18n } from "@/components/locale-provider";
import { GoogleSignIn } from "@/components/google-sign-in";
import { isStaffArea, pathIs } from "@/lib/paths";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const restaurantLogin = pathIs(next, "/restaurant");
  const partner = isStaffArea(next);
  const emailParam = params.get("email") ?? "";
  const { t } = useI18n();
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LocaleToggle />
      </div>
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">
        {partner ? t.partnerLogin : t.login}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{partner ? t.partnerHint : t.customerHint}</p>
      {error === "google_partner" ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.googlePartnerBlocked}</p>
      ) : error === "google" ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.googleFailed}</p>
      ) : error === "rate" ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.passwordResetRateLimited}</p>
      ) : error ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.loginFailed}</p>
      ) : params.get("reset") === "1" ? (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t.passwordResetDone}
        </p>
      ) : null}
      <form action="/login/submit" method="post" className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="email">{t.email}</Label>
          <Input
            id="email"
            className="mt-1 h-12 text-base"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <Label htmlFor="password">{t.password}</Label>
          <Input
            id="password"
            className="mt-1 h-12 text-base"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <Button className="h-12 w-full text-base" type="submit">
          {t.continue}
        </Button>
        {!partner ? (
          <p className="text-sm">
            <Link href="/login/forgot" className="font-medium text-primary">
              {t.forgotPassword}
            </Link>
          </p>
        ) : null}
      </form>
      {!partner ? <GoogleSignIn next={next} showApple /> : null}
      {restaurantLogin ? (
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>{t.partnerNoSignup}</p>
          <p>
            {t.notAPartnerYet}{" "}
            <Link href="/partner/anmelden" className="font-medium text-primary">
              {t.becomePartner}
            </Link>
          </p>
        </div>
      ) : partner ? null : (
        <p className="mt-6 text-sm">
          {t.noAccountYet}{" "}
          <Link href="/register" className="font-medium text-primary">
            {t.register}
          </Link>
        </p>
      )}
      <nav className="mt-10 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] text-[#9CA3AF]">
        <Link href="/datenschutz" className="hover:text-ink">
          {t.privacy}
        </Link>
        <span aria-hidden>·</span>
        <Link href="/impressum" className="hover:text-ink">
          {t.imprint}
        </Link>
        <span aria-hidden>·</span>
        <Link href="/hilfe" className="hover:text-ink">
          {t.help}
        </Link>
      </nav>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
