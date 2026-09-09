"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const preset = params.get("email") ?? "kunde@lieferway.de";
  const partner =
    next.startsWith("/restaurant") || next.startsWith("/admin") || next.startsWith("/courier");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">
        {partner ? "Partner-Anmeldung" : "Anmelden"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {partner
          ? "Zugang für Restaurant, Kurier oder Admin. Passwort: lieferway"
          : "Essen bestellen in Frankfurt. Passwort für das Demo-Konto: lieferway"}
      </p>
      {error ? (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">Anmeldung fehlgeschlagen.</p>
      ) : null}
      <form action={loginAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <Label htmlFor="email">E-Mail</Label>
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
          <Label htmlFor="password">Passwort</Label>
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
          Weiter
        </Button>
      </form>
      {!partner ? (
        <p className="mt-6 text-sm">
          Demo-Kunde: <span className="font-medium">kunde@lieferway.de</span>
        </p>
      ) : (
        <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
          <li>Restaurant · restaurant@lieferway.de</li>
          <li>Kurier · kurier@lieferway.de</li>
          <li>Admin · admin@lieferway.de</li>
        </ul>
      )}
      <p className="mt-6 text-sm">
        Noch kein Konto?{" "}
        <Link href="/register" className="font-medium text-primary">
          Registrieren
        </Link>
      </p>
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
