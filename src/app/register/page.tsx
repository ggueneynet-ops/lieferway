"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/locale-provider";
import { GoogleSignIn } from "@/components/google-sign-in";
import { normalizePhone } from "@/lib/phone";

export default function RegisterPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error(t.termsRequired);
      return;
    }
    if (!normalizePhone(phone)) {
      toast.error(t.phoneInvalid);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, locale }),
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
        <LanguageSwitcher />
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
          <Label>{t.phoneNumber}</Label>
          <Input
            className="mt-1 h-12"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+49 171 …"
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">{t.phoneHint}</p>
        </div>
        <div>
          <Label htmlFor="register-password">{t.password}</Label>
          <div className="relative mt-1">
            <Input
              id="register-password"
              className="h-12 pr-12"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[#6B7280]"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t.hidePassword : t.showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        <label className="flex items-start gap-2.5 text-sm leading-snug text-[#4B5563]">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 rounded border-[#D1D5DB] text-primary accent-primary"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
          />
          <span>
            {t.acceptTerms}{" "}
            <Link href="/datenschutz" className="font-medium text-primary underline-offset-2 hover:underline">
              {t.privacy}
            </Link>
            {t.acceptTermsEnd}
          </span>
        </label>
        <Button className="w-full" type="submit" disabled={busy || !accepted}>
          {t.register}
        </Button>
      </form>
      <GoogleSignIn next="/" showApple />
      <p className="mt-6 text-sm">
        {t.alreadyHaveAccount}{" "}
        <Link href="/login" className="font-medium text-primary">
          {t.login}
        </Link>
      </p>
    </div>
  );
}
