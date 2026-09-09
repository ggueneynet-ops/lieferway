import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-24 text-center">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold">Seite nicht gefunden</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Diese Adresse gibt es bei Lieferway nicht.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Zur Startseite</Link>
      </Button>
    </div>
  );
}
