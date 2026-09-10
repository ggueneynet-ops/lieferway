import { LogOut } from "lucide-react";

export function LogoutButton({
  label,
  variant = "button",
}: {
  label: string;
  variant?: "button" | "menu" | "header" | "sidebar";
}) {
  const className =
    variant === "menu"
      ? "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#C2185B] hover:bg-[#FCE4EC]"
      : variant === "header"
        ? "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-semibold text-[#111827] hover:bg-[#FCE4EC] hover:text-[#C2185B]"
        : variant === "sidebar"
          ? "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] font-semibold text-[#C2185B] hover:bg-[#FCE4EC]"
          : "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white text-base font-semibold text-[#111827] hover:bg-[#FCE4EC] hover:text-[#C2185B]";

  return (
    <form action="/logout" method="post">
      <button type="submit" className={className}>
        <LogOut className="size-4 shrink-0" strokeWidth={2} />
        {label}
      </button>
    </form>
  );
}
