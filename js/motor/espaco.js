// Espaço entre duas pessoas: avisa antes que elas se choquem.
// Lógica pura (sem DOM), assim os testes rodam no Node.
import { ESPACO } from '../config.js';

/**
 * @param {object} a, b { q, quadril, T }: pontos filtrados, meio do quadril e tronco de cada pessoa
 * @returns {{ distancia, nivel: 'ok'|'atencao'|'perto' }|null} distancia em troncos entre os quadris
 */
export function medirEspaco(a, b, limites = ESPACO) {
  if (!a || !b || !a.q || !b.q || !a.T || !b.T) return null;
  const T = (a.T + b.T) / 2;
  const distancia = Math.abs(a.quadril.x - b.quadril.x) / T;
  // a mão de um perto do corpo ou da mão do outro
  const [esq, dir] = a.quadril.x <= b.quadril.x ? [a, b] : [b, a];
  const xs = (p, nomes) => nomes.map((n) => p.q[n]).filter((k) => k && k.ok).map((k) => k.x);
  const nomes = ['pulsoE', 'pulsoD', 'tornozeloE', 'tornozeloD', 'ombroE', 'ombroD'];
  const maxEsq = Math.max(...xs(esq, nomes), esq.quadril.x);
  const minDir = Math.min(...xs(dir, nomes), dir.quadril.x);
  const folga = (minDir - maxEsq) / T;
  let nivel = 'ok';
  if (distancia < limites.perto || folga < limites.maos) nivel = 'perto';
  else if (distancia < limites.atencao) nivel = 'atencao';
  return { distancia, folga, nivel };
}
