import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page, pageSize, total, onPageChange,
}: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const go = (p: number) => onPageChange(Math.min(pages, Math.max(1, p)));
  // Compact page list
  const list: (number | "…")[] = [];
  const push = (n: number | "…") => { if (list[list.length - 1] !== n) list.push(n); };
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) push(i);
    else if (i < page) push("…");
    else if (i > page) { push("…"); }
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t bg-card/50 px-4 py-2.5 text-xs">
      <p className="text-muted-foreground">Mostrando <span className="font-medium text-foreground tabular">{start}-{end}</span> de <span className="font-medium text-foreground tabular">{total}</span></p>
      <div className="flex items-center gap-1">
        <button onClick={() => go(page - 1)} disabled={page <= 1} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
        {list.map((p, i) => p === "…" ? (
          <span key={`e${i}`} className="px-1.5 text-muted-foreground">…</span>
        ) : (
          <button key={p} onClick={() => go(p)} className={cn("h-7 min-w-[28px] rounded-md border px-2 text-xs font-medium tabular", p === page ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>{p}</button>
        ))}
        <button onClick={() => go(page + 1)} disabled={page >= pages} className="flex h-7 w-7 items-center justify-center rounded-md border bg-background hover:bg-muted disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}