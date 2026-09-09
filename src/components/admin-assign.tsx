"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function AdminAssign({
  orderId,
  current,
  couriers,
  label,
}: {
  orderId: string;
  current: string | null;
  couriers: { id: string; name: string }[];
  label?: string;
}) {
  const router = useRouter();
  return (
    <select
      className="max-w-[160px] rounded-lg border bg-background px-2 py-1 text-xs"
      defaultValue={current ?? ""}
      onChange={async (e) => {
        const courierId = e.target.value || null;
        const res = await fetch(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "assign", courierId }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error);
          return;
        }
        toast.success("Kurier zugewiesen");
        router.refresh();
      }}
    >
      <option value="">{label ? label : "Zuweisen"}</option>
      {couriers.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
