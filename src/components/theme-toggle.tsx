import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Props { className?: string; size?: "sm" | "md" }

export function ThemeToggle({ className, size = "md" }: Props) {
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";
  const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";
  const Icon = isDark ? Sun : Moon;
  const h = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition",
        h,
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}