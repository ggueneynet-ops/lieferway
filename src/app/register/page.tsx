"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locale, setLocale] = useState<"de" | "tr">("de");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, locale }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Fehler");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">Konto erstellen</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>Name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>E-Mail</Label>
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>Passwort</Label>
          <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setLocale("de")} className={`rounded-full border px-3 py-1 ${locale === "de" ? "bg-primary text-primary-foreground" : ""}`}>
            Deutsch
          </button>
          <button type="button" onClick={() => setLocale("tr")} className={`rounded-full border px-3 py-1 ${locale === "tr" ? "bg-primary text-primary-foreground" : ""}`}>
            Türkçe
          </button>
        </div>
        <Button className="w-full" type="submit" disabled={busy}>
          Registrieren
        </Button>
      </form>
      <p className="mt-6 text-sm">
        Bereits Kunde?{" "}
        <Link href="/login" className="font-medium text-primary">
          Anmelden
        </Link>
      </p>
    </div>
  );
}
