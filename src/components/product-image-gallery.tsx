import { useEffect, useState } from "react";
import { Images } from "lucide-react";
import { useProductImages } from "@/lib/queries";

interface Props {
  nome: string;
  onPick: (url: string) => void;
}

export function ProductImageGallery({ nome, onPick }: Props) {
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(nome.trim()), 600);
    return () => clearTimeout(t);
  }, [nome]);
  const { data: imgs = [], isLoading } = useProductImages(debounced);

  return (
    <details className="group rounded-md border bg-card/40">
      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5">
          <Images className="h-3.5 w-3.5" />
          Galeria do banco
          {imgs.length > 0 && <span className="text-muted-foreground">({imgs.length})</span>}
        </span>
        <span className="text-[10px] text-muted-foreground group-open:hidden">abrir</span>
      </summary>
      <div className="border-t p-2">
        {isLoading ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">Buscando...</p>
        ) : imgs.length === 0 ? (
          <p className="px-1 py-2 text-[11px] text-muted-foreground">
            {debounced ? "Nenhuma imagem para esse nome" : "Digite o nome para sugestões"}
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {imgs.map((i: any) => (
              <button
                key={i.id}
                type="button"
                onClick={() => onPick(i.url)}
                title={i.nome}
                className="group/img relative aspect-square overflow-hidden rounded border bg-muted transition hover:ring-2 hover:ring-primary"
              >
                <img src={i.url} alt={i.nome} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}