// Sons centralizados para scanner / PDV. Sintetizados via WebAudio.
// Reusa um único AudioContext (cria sob gesto do usuário).

let _ctx: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return null;
    if (!_ctx || _ctx.state === "closed") _ctx = new Ctx() as AudioContext;
    const c = _ctx!;
    if (c.state === "suspended") c.resume().catch(() => {});
    return c;
  } catch {
    return null;
  }
}

function tone(freq: number, duration: number, when = 0, type: OscillatorType = "square", peak = 0.18) {
  const c = ctx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Beep curto estilo PDV de supermercado (1 tom). */
export function beepScan() {
  tone(1760, 0.09, 0, "square", 0.22);
}

/** Tríade ascendente para sucesso (cadastro / identificação OK). */
export function beepSuccess() {
  tone(880, 0.09, 0.0, "sine", 0.2);   // A5
  tone(1175, 0.09, 0.09, "sine", 0.2); // D6
  tone(1568, 0.16, 0.18, "sine", 0.22); // G6
}

/** Duplo grave para erro / já cadastrado. */
export function beepError() {
  tone(320, 0.14, 0, "sawtooth", 0.18);
  tone(220, 0.18, 0.15, "sawtooth", 0.18);
}