import { Badge } from "@/components/ui/badge";
import { orderStatusLabel, type Locale } from "@/lib/i18n";

const tones: Record<string, string> = {
  PLACED: "bg-warning/15 text-ink",
  ACCEPTED: "bg-primary-soft text-ink",
  PREPARING: "bg-primary-soft text-primary-pressed",
  READY: "bg-bg-muted text-ink",
  OUT_FOR_DELIVERY: "bg-primary-soft text-ink",
  DELIVERED: "bg-success/15 text-success",
  REJECTED: "bg-danger/10 text-danger",
  CANCELLED: "bg-bg-muted text-text-secondary",
};

export function StatusBadge({
  status,
  locale = "de",
  fulfillmentType,
}: {
  status: string;
  locale?: Locale;
  fulfillmentType?: string | null;
}) {
  return (
    <Badge className={`border-0 ${tones[status] ?? "bg-muted"}`}>
      {orderStatusLabel(locale, status, fulfillmentType)}
    </Badge>
  );
}
