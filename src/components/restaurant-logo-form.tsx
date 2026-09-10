import { RestaurantLogo } from "@/components/restaurant-logo";

export function RestaurantLogoForm({
  restaurantId,
  name,
  slug,
  logoUrl,
  action,
  labels,
}: {
  restaurantId: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  action: string;
  labels: {
    shopLogo: string;
    shopLogoHint: string;
    save: string;
    photoOptional: string;
  };
}) {
  return (
    <form action={action} method="post" encType="multipart/form-data" className="mt-3 space-y-2">
      <input type="hidden" name="id" value={restaurantId} />
      <p className="text-sm font-medium text-ink">{labels.shopLogo}</p>
      <div className="flex items-center gap-3">
        <RestaurantLogo name={name} logoUrl={logoUrl} slug={slug} size={48} />
        <p className="text-xs text-text-secondary">{labels.shopLogoHint}</p>
      </div>
      <label className="sr-only" htmlFor={`logo-url-${restaurantId}`}>
        {labels.shopLogo}
      </label>
      <input
        id={`logo-url-${restaurantId}`}
        name="logoUrl"
        defaultValue={logoUrl ?? ""}
        placeholder={labels.photoOptional}
        className="h-11 w-full rounded-lg border border-border bg-background px-3 text-base"
      />
      <input
        name="logoFile"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="block w-full text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink"
      />
      <button
        type="submit"
        className="h-11 w-full rounded-xl border border-border bg-surface text-sm font-medium text-ink hover:bg-bg-muted"
      >
        {labels.save}
      </button>
    </form>
  );
}
