import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type Locale } from "@/lib/i18n";

const tones: Record<string, string> = {
  PLACED: "bg-amber-100 text-amber-900",
  ACCEPTED: "bg-sky-100 text-sky-900",
  PREPARING: "bg-orange-100 text-orange-900",
  READY: "bg-violet-100 text-violet-900",
  OUT_FOR_DELIVERY: "bg-blue-100 text-blue-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-red-100 text-red-900",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

export function StatusBadge({ status, locale = "de" }: { status: string; locale?: Locale }) {
  return (
    <Badge className={`border-0 ${tones[status] ?? "bg-muted"}`}>
      {STATUS_LABEL[locale][status] ?? status}
    </Badge>
  );
}
