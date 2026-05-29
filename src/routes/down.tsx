import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export const Route = createFileRoute("/down")({
  head: () => ({
    meta: [
      { title: "Baixar projeto" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DownPage,
});

function DownPage() {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/down");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `projeto-${ts}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert("Falha ao baixar o projeto: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Baixar projeto
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gera um arquivo <code className="rounded bg-muted px-1">.zip</code> com
          todo o código-fonte do projeto, exatamente como está agora.
        </p>
        <button
          onClick={handleDownload}
          disabled={loading}
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" /> Baixar
            </>
          )}
        </button>
      </div>
    </div>
  );
}