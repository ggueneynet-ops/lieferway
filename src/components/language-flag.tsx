import { LANGUAGE_LABELS, type Locale } from "@/lib/i18n";

const SIZE = {
  sm: 28,
  md: 32,
} as const;

export function LanguageFlag({
  locale,
  active = false,
  size = "sm",
  className = "",
}: {
  locale: Locale;
  active?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const px = SIZE[size];
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full border bg-white ${
        active ? "border-[#E91E63] ring-2 ring-[#E91E63]/20" : "border-[#E5E7EB]"
      } ${className}`}
      style={{ width: px, height: px }}
      aria-hidden
    >
      <img
        src={`/flags/${locale}.svg`}
        alt=""
        width={px}
        height={px}
        className="size-full object-cover"
        draggable={false}
      />
      <span className="sr-only">{LANGUAGE_LABELS[locale]}</span>
    </span>
  );
}
