import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { isPlausibleBarcode, normalizeEan } from "@/lib/ean";

/**
 * Captura GLOBAL de scanner HID (USB/Bluetooth que simula teclado).
 *
 * Heurística:
 *  - Acumula `event.key` numéricos (e A-Z para Code-128).
 *  - Se o gap entre teclas for > `maxGapMs` (default 35ms), descarta — é digitação humana.
 *  - Quando recebe Enter/Tab e o buffer tem >= minLength, dispara o handler.
 *  - Deduplicação: ignora o mesmo código repetido em < 1200ms.
 *  - NÃO captura quando o foco está dentro de inputs/textarea/select, exceto inputs
 *    com data-hid-capture="true" (input invisível dedicado).
 */

type Handler = (code: string) => void;

interface ScannerCtx {
  subscribe: (fn: Handler) => () => void;
}

const Ctx = createContext<ScannerCtx | null>(null);

const MAX_GAP_MS = 35;
const MIN_LEN = 6;
const MAX_LEN = 32;
const DEDUP_MS = 1200;

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.dataset.hidCapture === "true") return false; // input invisível dedicado
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function HidScannerProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<Set<Handler>>(new Set());
  const bufferRef = useRef<string>("");
  const lastKeyAtRef = useRef<number>(0);
  const lastFiredRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const subscribe = useCallback((fn: Handler) => {
    handlersRef.current.add(fn);
    return () => { handlersRef.current.delete(fn); };
  }, []);

  const fire = useCallback((rawCode: string) => {
    const code = normalizeEan(rawCode) || rawCode.trim();
    if (!code) return;
    const now = Date.now();
    if (lastFiredRef.current.code === code && now - lastFiredRef.current.at < DEDUP_MS) return;
    lastFiredRef.current = { code, at: now };
    handlersRef.current.forEach((h) => {
      try { h(code); } catch (err) { console.error("[HID handler]", err); }
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onKey = (e: KeyboardEvent) => {
      // Ignora se foco em campo editável (a menos que seja o capture-input dedicado)
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      const gap = now - lastKeyAtRef.current;
      lastKeyAtRef.current = now;

      // Gap grande = digitação humana ou primeira tecla, reseta o buffer
      if (gap > MAX_GAP_MS && e.key.length === 1) {
        bufferRef.current = "";
      }

      if (e.key === "Enter" || e.key === "Tab") {
        const buf = bufferRef.current;
        bufferRef.current = "";
        if (buf.length >= MIN_LEN && buf.length <= MAX_LEN && isPlausibleBarcode(buf, MIN_LEN, MAX_LEN)) {
          e.preventDefault();
          e.stopPropagation();
          fire(buf);
        }
        return;
      }

      // Aceita apenas caracteres imprimíveis típicos de scanners (números + letras)
      if (e.key.length === 1 && /[A-Za-z0-9\-]/.test(e.key)) {
        bufferRef.current += e.key;
        if (bufferRef.current.length > MAX_LEN) bufferRef.current = bufferRef.current.slice(-MAX_LEN);
      }
    };

    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as any);
  }, [fire]);

  return <Ctx.Provider value={{ subscribe }}>{children}</Ctx.Provider>;
}

export function useHidScanner(onCode: Handler, enabled = true) {
  const ctx = useContext(Ctx);
  const handlerRef = useRef(onCode);
  useEffect(() => { handlerRef.current = onCode; }, [onCode]);
  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.subscribe((code) => handlerRef.current(code));
  }, [ctx, enabled]);
}