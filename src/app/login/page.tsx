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
import { loginAction } from "./actions";
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
  const [helpOpen, setHelpOpen] = useState(false);

  const demoEmail = restaurantLogin ? "restaurant@lieferway.de" : partner ? "admin@lieferway.de" : "kunde@lieferway.de";

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
      ) : error ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">{t.loginFailed}</p>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
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
      </form>
      {!partner ? <GoogleSignIn next={next} showApple /> : null}
      <details
        className="mt-5 rounded-xl border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2 text-sm"
        open={helpOpen}
        onToggle={(e) => setHelpOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer text-[13px] font-medium text-[#6B7280]">{t.demoHelp}</summary>
        <div className="mt-2 space-y-2 text-[12px] text-[#6B7280]">
          <p className="font-medium text-[#4B5563]">{demoEmail}</p>
          <p>{t.demoHelpPassword}</p>
          <button
            type="button"
            className="text-[12px] font-medium text-primary"
            onClick={() => {
              setEmail(demoEmail);
              setPassword("lieferway");
            }}
          >
            {t.fillDemo}
          </button>
        </div>
      </details>
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
