import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  padded = true,
  allowOverflow = false,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  allowOverflow?: boolean;
}) {
  return (
    <section className={cn(allowOverflow ? "overflow-visible" : "overflow-hidden", "rounded-xl border bg-card shadow-subtle", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between border-b px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}