"use client";

import { useI18n } from "@/components/locale-provider";
import { toast } from "sonner";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.4c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.7z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4A7.2 7.2 0 0 1 5 12c0-.8.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.1 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
      <path d="M16.37 12.64c-.03-2.14 1.75-3.17 1.83-3.22-1-1.46-2.56-1.66-3.11-1.68-1.32-.14-2.58.78-3.25.78-.67 0-1.71-.76-2.81-.74-1.45.02-2.78.84-3.52 2.14-1.51 2.61-.38 6.47 1.08 8.59.72 1.04 1.57 2.2 2.69 2.16 1.08-.04 1.49-.7 2.8-.7 1.3 0 1.68.7 2.81.67 1.17-.02 1.9-1.05 2.61-2.1.82-1.2 1.16-2.37 1.18-2.43-.03-.01-2.25-.86-2.28-3.47zM14.5 6.9c.59-.72.99-1.72.88-2.72-.85.03-1.88.57-2.49 1.28-.55.63-1.03 1.65-.9 2.62.95.07 1.93-.48 2.51-1.18z" />
    </svg>
  );
}

export function GoogleSignIn({ next = "/", showApple = false }: { next?: string; showApple?: boolean }) {
  const { t } = useI18n();
  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.orContinueWith}
        <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href={`/api/auth/google?next=${encodeURIComponent(dest)}`}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white text-sm font-medium text-ink hover:bg-bg-muted"
      >
        <GoogleMark />
        {t.continueWithGoogle}
      </a>
      {showApple ? (
        <button
          type="button"
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black text-sm font-medium text-white"
          onClick={() => {
            toast.message(t.appleComingSoon);
          }}
        >
          <AppleMark />
          {t.continueWithApple}
        </button>
      ) : null}
    </div>
  );
}
