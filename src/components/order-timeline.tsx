import { STATUS_FLOW } from "@/lib/constants";
import { STATUS_LABEL, type Locale } from "@/lib/i18n";
import { Check } from "lucide-react";

export function OrderTimeline({ status, locale = "de" }: { status: string; locale?: Locale }) {
  if (status === "REJECTED" || status === "CANCELLED") {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {STATUS_LABEL[locale][status]}
      </p>
    );
  }
  const idx = STATUS_FLOW.indexOf(status as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="space-y-3">
      {STATUS_FLOW.map((step, i) => {
        const done = idx >= i;
        const current = idx === i;
        return (
          <li key={step} className="flex items-center gap-3">
            <span
              className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              } ${current ? "ring-4 ring-primary/20" : ""}`}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={done ? "font-medium" : "text-muted-foreground"}>
              {STATUS_LABEL[locale][step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
