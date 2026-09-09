"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const DEMOS = [
  { email: "kunde@lieferway.de", role: "Kunde" },
  { email: "restaurant@lieferway.de", role: "Anadolu Grill" },
  { email: "kurier@lieferway.de", role: "Kurier" },
  { email: "admin@lieferway.de", role: "Admin" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [email, setEmail] = useState("kunde@lieferway.de");
  const [password, setPassword] = useState("lieferway");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    const dest =
      data.user.role === "ADMIN"
        ? "/admin"
        : data.user.role === "RESTAURANT"
          ? "/restaurant"
          : data.user.role === "COURIER"
            ? "/courier"
            : next;
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">Anmelden</h1>
      <p className="mt-1 text-sm text-muted-foreground">Passwort für alle Demo-Konten: lieferway</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>E-Mail</Label>
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Passwort</Label>
          <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" type="submit" disabled={busy}>
          {busy ? "…" : "Weiter"}
        </Button>
      </form>
      <div className="mt-6 rounded-2xl border bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo-Zugang</p>
        <ul className="mt-2 space-y-1 text-sm">
          {DEMOS.map((d) => (
            <li key={d.email}>
              <button
                type="button"
                className="text-left hover:text-primary"
                onClick={() => setEmail(d.email)}
              >
                {d.email} <span className="text-muted-foreground">· {d.role}</span>
              </button>
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
