"use client";

import { Suspense } from "react";
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
import { isStaffArea } from "@/lib/paths";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const preset = params.get("email") ?? "kunde@lieferway.de";
  const partner = isStaffArea(next);
  const { t } = useI18n();

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
            defaultValue={preset}
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
            defaultValue="lieferway"
            required
          />
        </div>
        <Button className="h-12 w-full text-base" type="submit">
          {t.continue}
        </Button>
      </form>
      {!partner ? <GoogleSignIn next={next} /> : null}
      {!partner ? (
        <p className="mt-6 text-sm">
          {t.demoCustomer}: <span className="font-medium">kunde@lieferway.de</span>
        </p>
      ) : (
        <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
          <li>{t.restaurantPanel} · restaurant@lieferway.de</li>
          <li>{t.courierPanel} · kurier@lieferway.de</li>
          <li>{t.adminPanel} · admin@lieferway.de</li>
        </ul>
      )}
      {partner ? (
        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>{t.partnerNoSignup}</p>
          <p>
            {t.notAPartnerYet}{" "}
            <Link href="/partner/anmelden" className="font-medium text-primary">
              {t.becomePartner}
            </Link>
          </p>
        </div>
      ) : (
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
