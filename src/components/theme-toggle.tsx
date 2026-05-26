import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface Props { className?: string; size?: "sm" | "md" }

export function ThemeToggle({ className, size = "md" }: Props) {
  const { theme, cycle } = useTheme();
  const label = theme === "light" ? "Tema claro" : theme === "dark" ? "Tema escuro" : "Tema do sistema";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  const h = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={cycle}
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