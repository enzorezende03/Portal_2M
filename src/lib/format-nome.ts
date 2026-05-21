// Formata nomes de pessoas:
// - Primeira letra maiúscula, restante minúscula
// - Preposições/artigos em minúsculo: de, do, da, dos, das, e
// - Abreviações de uma letra (C, F, etc.) e "Jr"/"Sr"/"Neto"... recebem ponto
const MINUSCULAS = new Set(["de", "do", "da", "dos", "das", "e"]);
const SUFIXOS_ABREV = new Set(["jr", "sr", "sra", "neto", "filho"]);

export function formatNome(nome?: string | null): string {
  if (!nome) return "";
  const partes = nome.trim().split(/\s+/);
  return partes
    .map((parte, i) => {
      const limpo = parte.replace(/\.+$/, "");
      const lower = limpo.toLowerCase();

      // Preposições/artigos — nunca no início
      if (i > 0 && MINUSCULAS.has(lower)) return lower;

      // Abreviação de uma letra → "C."
      if (limpo.length === 1 && /[a-záàâãéêíóôõúç]/i.test(limpo)) {
        return limpo.toUpperCase() + ".";
      }

      // Sufixos tipo Jr, Sr, Neto → "Jr."
      if (SUFIXOS_ABREV.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1) + ".";
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
