"use client";

import { Button } from "@/components/ui/button";

/**
 * Route-level recovery so a leftover restaurant throw does not replace the
 * whole app with the branded global-error page.
 */
export default function RestaurantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-[#111827]">Seite konnte nicht geladen werden</h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        Der Restaurantbereich konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-[#9CA3AF]">Digest {error.digest}</p> : null}
      <Button type="button" className="mt-6" onClick={() => reset()}>
        Neu laden
      </Button>
    </div>
  );
}
