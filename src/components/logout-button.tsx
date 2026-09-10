import { LogOut } from "lucide-react";

const VARIANTS = {
  menu: "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#7A2340] hover:bg-[#FAF3EA]",
  header:
    "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] hover:bg-[#FAF3EA] hover:text-[#7A2340]",
  sidebar:
    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold text-[#7A2340] hover:bg-[#FAF3EA]",
  quiet:
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#7A2340]",
  button:
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-base font-semibold text-[#111827] hover:bg-[#FAF3EA] hover:text-[#7A2340]",
} as const;

export function LogoutButton({
  label,
  variant = "button",
}: {
  label: string;
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <form action="/logout" method="post">
      <button type="submit" className={VARIANTS[variant]}>
        <LogOut className={variant === "quiet" ? "size-3.5 shrink-0" : "size-4 shrink-0"} strokeWidth={2} />
        {label}
      </button>
    </form>
  );
}
