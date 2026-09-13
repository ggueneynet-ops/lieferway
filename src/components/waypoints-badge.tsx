export function WayPointsBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-white/95 px-2 py-[3px] text-[10px] font-bold text-[#C2185B] shadow-sm ring-1 ring-[#F8BBD0]/80">
      ✦ {label}
    </span>
  );
}
