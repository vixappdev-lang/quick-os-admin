/**
 * Normaliza um código de barras lido por scanner HID ou câmera.
 * - Remove espaços e caracteres não-numéricos
 * - Preserva zeros à esquerda
 * - Aceita comprimentos comuns (EAN-8/12/13/14, Code-128 numérico)
 */
export function normalizeEan(raw: string): string {
  if (!raw) return "";
  const digits = String(raw).trim().replace(/\D+/g, "");
  return digits;
}

/**
 * Valida o dígito verificador de EAN-8, UPC-A (12) e EAN-13.
 * Code-128 e demais formatos não têm checksum padrão e são aceitos como válidos
 * (retorna `true` para len ∉ {8,12,13}). Use somente como sanity check, nunca
 * como gate único — scanners de baixo custo às vezes invertem dígito.
 */
export function isValidEanChecksum(ean: string): boolean {
  const code = normalizeEan(ean);
  if (code.length !== 8 && code.length !== 12 && code.length !== 13) return true;
  const digits = code.split("").map((d) => Number(d));
  const check = digits.pop()!;
  // Soma posicional (índice da direita para a esquerda, sem o dígito verificador)
  const sum = digits
    .reverse()
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  const expected = (10 - (sum % 10)) % 10;
  return expected === check;
}

export function isPlausibleBarcode(raw: string, minLen = 6, maxLen = 32): boolean {
  const code = normalizeEan(raw);
  return code.length >= minLen && code.length <= maxLen;
}