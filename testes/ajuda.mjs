// Ajuda dos testes: roda uma animação sintética no LeitorCorpo.
import { LeitorCorpo } from '../js/motor/corpo.js';
import { ANIMACOES, paraCamera } from '../js/motor/poses.js';

export const DT = 1 / 30;

// Calibra parado e chama `aoQuadro(saida, t, leitor)` em cada quadro de `reps` ciclos da animação.
export function rodar(anim, { reps = 6, ciclo = 2, camera = {}, baseFirme = false, aoQuadro = () => {} } = {}) {
  const L = new LeitorCorpo();
  let t = 0;
  for (let i = 0; i < 60; i++, t += DT) L.atualizar(paraCamera(ANIMACOES.parado(i / 60), camera), t);
  L.baseFirme = baseFirme;
  const n = {};
  const seg = {};
  const todas = [];
  for (let i = 0; i < reps * ciclo * 30; i++, t += DT) {
    const r = L.atualizar(paraCamera(ANIMACOES[anim](((i * DT) / ciclo) % 1), camera), t);
    for (const k in r.reps) {
      n[k] = (n[k] || 0) + 1;
      todas.push({ nome: k, t, ...r.reps[k] });
    }
    for (const k in r.segurando) if (r.segurando[k]) seg[k] = (seg[k] || 0) + 1;
    aoQuadro(r, t, L);
  }
  return { L, n, seg, todas };
}
