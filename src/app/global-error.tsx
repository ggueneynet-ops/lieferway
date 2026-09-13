"use client";

import "./globals.css";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * Replaces the root layout when a render error escapes. Keep self-contained
 * (own html/body) so a broken Providers tree cannot blank the recovery UI.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground antialiased">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-24 text-center">
          <Logo href={null} />
          <h1 className="mt-8 text-2xl font-semibold">Seite konnte nicht geladen werden</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Es ist ein Serverfehler aufgetreten. Bitte lade die Seite neu.
          </p>
          {error.digest ? (
            <p className="mt-3 font-mono text-xs text-muted-foreground">Digest {error.digest}</p>
          ) : null}
          <Button type="button" className="mt-6" onClick={() => reset()}>
            Neu laden
          </Button>
        </div>
      </body>
    </html>
  );
}