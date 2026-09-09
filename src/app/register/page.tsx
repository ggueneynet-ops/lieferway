"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LocaleToggle } from "@/components/locale-toggle";
import { useI18n } from "@/components/locale-provider";
import { LOCALES, type Locale } from "@/lib/i18n";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      toast.error(data.error ?? t.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-4 py-16">
      <div className="flex items-center justify-between">
        <Logo />
        <LocaleToggle />
      </div>
      <h1 className="mt-8 text-2xl font-semibold">{t.createAccount}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.registerCustomerOnly}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <Label>{t.name}</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <Label>{t.email}</Label>
          <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>{t.password}</Label>
          <Input className="mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </div>
        <div className="flex gap-2 text-sm">
          {LOCALES.map((code: Locale) => (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-full border px-3 py-1 ${locale === code ? "bg-primary text-primary-foreground" : ""}`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
        <Button className="w-full" type="submit" disabled={busy}>
          {t.register}
        </Button>
      </form>
      <p className="mt-6 text-sm">
        {t.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-primary">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
