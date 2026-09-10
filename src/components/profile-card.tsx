"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";
import { normalizePhone } from "@/lib/phone";

function initials(name: string, email: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1 && parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (email[0] ?? "?").toUpperCase();
}

export function ProfileCard({
  name,
  email,
  phone,
  canEdit,
}: {
  name: string;
  email: string;
  phone: string;
  canEdit: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nextName, setNextName] = useState(name);
  const [nextPhone, setNextPhone] = useState(phone);
  const [busy, setBusy] = useState(false);
  const mark = initials(name, email);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (nextName.trim().length < 2) {
      toast.error(t.nameRequired);
      return;
    }
    if (nextPhone.trim() && !normalizePhone(nextPhone)) {
      toast.error(t.phoneInvalid);
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/phone", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextName.trim(), phone: nextPhone.trim() || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? t.error);
      return;
    }
    toast.success(t.saveProfile);
    setEditing(false);
    router.refresh();
  }

  return (
    <section className="rounded-[24px] border border-[#E5E7EB] bg-white px-5 py-6 shadow-[0_8px_30px_rgba(17,24,39,0.04)]">
      <div className="flex flex-col items-center text-center">
        <span
          className="flex size-20 items-center justify-center rounded-full bg-[#FFF5F8] font-display text-2xl font-semibold text-[#C2185B]"
          aria-hidden
        >
          {mark}
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-[#111827]">{name}</h1>
        <p className="mt-1 break-all text-sm text-[#6B7280]">{email}</p>
        <p className="mt-1 text-sm text-[#111827]">{phone || "—"}</p>
        {canEdit && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 h-9 rounded-full border border-[#E5E7EB] px-4 text-[13px] font-medium text-[#111827] hover:bg-[#FAFAFA]"
          >
            {t.editProfile}
          </button>
        ) : null}
      </div>
      {canEdit && editing ? (
        <form onSubmit={save} className="mt-6 space-y-3 border-t border-[#F3F4F6] pt-5 text-left">
          <div>
            <Label htmlFor="profile-name">{t.name}</Label>
            <Input
              id="profile-name"
              className="mt-1 h-11"
              value={nextName}
              onChange={(e) => setNextName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <Label htmlFor="profile-phone">{t.phoneNumber}</Label>
            <Input
              id="profile-phone"
              className="mt-1 h-11"
              type="tel"
              inputMode="tel"
              value={nextPhone}
              onChange={(e) => setNextPhone(e.target.value)}
              placeholder="+49 171 …"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              className="h-10 flex-1 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6]"
              onClick={() => {
                setNextName(name);
                setNextPhone(phone);
                setEditing(false);
              }}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="h-10 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? t.save : t.saveProfile}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
