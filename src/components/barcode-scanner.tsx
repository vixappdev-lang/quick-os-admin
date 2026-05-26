import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}

function beep() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch {}
}

export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const nativeStopRef = useRef<(() => void) | null>(null);
  const lastCodeRef = useRef<{ code: string; t: number }>({ code: "", t: 0 });
  const [manual, setManual] = useState("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIx, setDeviceIx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleCode = (code: string) => {
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.t < 1200) return;
    lastCodeRef.current = { code, t: now };
    beep();
    onDetected(code);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Câmera não disponível neste dispositivo. Use o campo manual abaixo.");
          return;
        }
        const deviceId = devices[deviceIx]?.deviceId;
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: "environment" } },
          audio: false,
        };

        // Native BarcodeDetector path
        const BD: any = (window as any).BarcodeDetector;
        if (BD) {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          const video = videoRef.current!;
          video.srcObject = stream;
          await video.play().catch(() => {});
          // iOS Safari: enumerateDevices só devolve labels após permissão
          try {
            const all = await navigator.mediaDevices.enumerateDevices();
            const cams = all.filter((d) => d.kind === "videoinput");
            if (!cancelled && cams.length !== devices.length) setDevices(cams);
          } catch {}
          const detector = new BD({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "qr_code"],
          });
          let raf = 0;
          const tick = async () => {
            if (cancelled) return;
            try {
              const codes = await detector.detect(video);
              if (codes && codes[0]?.rawValue) handleCode(String(codes[0].rawValue).trim());
            } catch {}
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
          nativeStopRef.current = () => {
            cancelAnimationFrame(raf);
            stream.getTracks().forEach((t) => t.stop());
          };
          return;
        }

        // ZXing fallback
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;
        await reader.decodeFromConstraints(constraints, videoRef.current!, (result) => {
          if (cancelled) return;
          if (result) handleCode(result.getText().trim());
        });
        try {
          const all = await navigator.mediaDevices.enumerateDevices();
          const cams = all.filter((d) => d.kind === "videoinput");
          if (!cancelled && cams.length !== devices.length) setDevices(cams);
        } catch {}
      } catch (e: any) {
        const name = e?.name ?? "";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setError("Permissão de câmera negada. Autorize nos ajustes do navegador ou use o campo manual abaixo.");
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setError("Nenhuma câmera encontrada. Use o campo manual abaixo.");
        } else {
          setError(e?.message ?? "Erro ao iniciar a câmera");
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      try { nativeStopRef.current?.(); } catch {}
      nativeStopRef.current = null;
      try {
        const v = videoRef.current;
        const s = v?.srcObject as MediaStream | null;
        s?.getTracks().forEach((t) => t.stop());
        if (v) v.srcObject = null;
      } catch {}
      try { (readerRef.current as any)?.reset?.(); } catch {}
      readerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, deviceIx]);

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return toast.error("Informe um código");
    handleCode(v);
    setManual("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg max-sm:!w-screen max-sm:!max-w-none max-sm:!h-[100dvh] max-sm:!rounded-none max-sm:!translate-x-0 max-sm:!translate-y-0 max-sm:!top-0 max-sm:!left-0 max-sm:flex max-sm:flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" /> Scanner de código de barras
          </DialogTitle>
        </DialogHeader>
        <div className="relative bg-black sm:aspect-[4/3] max-sm:flex-1 max-sm:min-h-0">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/90">{error}</div>
          ) : (
            <>
              <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-1/3 w-4/5 rounded-lg border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              {devices.length > 1 && (
                <button onClick={() => setDeviceIx((i) => (i + 1) % devices.length)} className="absolute right-3 top-3 inline-flex h-10 items-center gap-1.5 rounded-md bg-black/70 px-3 text-xs font-medium text-white hover:bg-black/90 active:scale-95">
                  <RefreshCw className="h-3.5 w-3.5" /> Trocar câmera
                </button>
              )}
            </>
          )}
        </div>
        <div className="border-t p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">Aponte o código para a área central. Ou digite manualmente:</p>
          <div className="flex gap-2">
            <input
              autoFocus={!isMobile}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }}
              inputMode="numeric"
              placeholder="Código de barras..."
              className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button onClick={submitManual} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)]">OK</button>
            <button onClick={onClose} className="h-9 rounded-md border bg-card px-3 text-sm hover:bg-muted inline-flex items-center gap-1"><X className="h-3 w-3" /> Fechar</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}