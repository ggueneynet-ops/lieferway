import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <Logo size="sm" />
        <p className="max-w-md text-sm text-muted-foreground">
          Lieferway GmbH i.G. · Frankfurt am Main · Demo ohne echten Zahlungsverkehr.
          Restaurant-Provision standardmäßig 5 % auf Speisen. Auszahlung montags.
        </p>
      </div>
    </footer>
  );
}
