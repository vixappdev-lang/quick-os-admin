import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  trend,
  accent = "primary",
}: {
  label: string;
  value: string;
  delta?: number;
  icon: LucideIcon;
  trend?: number[];
  accent?: "primary" | "success" | "warning" | "info";
}) {
  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
  };
  const up = (delta ?? 0) >= 0;
  const data = (trend ?? [3, 5, 4, 7, 6, 9, 8, 11, 10]).map((v, i) => ({ i, v }));
  const gid = `spark-${label.replace(/\s+/g, "")}`;
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-5 shadow-subtle transition-shadow hover:shadow-elegant">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="tabular text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        {delta !== undefined && (
          <div className={cn("inline-flex items-center gap-1 text-xs font-medium", up ? "text-success" : "text-destructive")}>
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span className="tabular">{Math.abs(delta).toFixed(1)}%</span>
            <span className="font-normal text-muted-foreground">vs ontem</span>
          </div>
        )}
        <div className="h-8 w-24">
          <ResponsiveContainer>
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={1.5} fill={`url(#${gid})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}