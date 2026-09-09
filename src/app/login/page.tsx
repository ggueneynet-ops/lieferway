"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

const DEMOS = [
  { email: "kunde@lieferway.de", role: "Kunde" },
  { email: "restaurant@lieferway.de", role: "Anadolu Grill" },
  { email: "kurier@lieferway.de", role: "Kurier" },
  { email: "admin@lieferway.de", role: "Admin" },
];

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const error = params.get("error");
  const preset = params.get("email") ?? "kunde@lieferway.de";

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 font-display text-2xl font-semibold text-ink">Anmelden</h1>
      <p className="mt-1 text-sm text-muted-foreground">Passwort für alle Demo-Konten: lieferway</p>
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
      <div className="mt-6 rounded-2xl border bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo-Zugang</p>
        <ul className="mt-2 space-y-1 text-sm">
          {DEMOS.map((d) => (
            <li key={d.email}>
              <a
                href={`/login?email=${encodeURIComponent(d.email)}&next=${encodeURIComponent(next)}`}
                className="text-left hover:text-primary"
              >
                {d.email} <span className="text-muted-foreground">· {d.role}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
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
