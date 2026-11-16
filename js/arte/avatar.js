// Esqueletos de neon: o da pessoa (pontos da câmera) e o boneco que mostra o exercício.
import { CORES } from '../config.js';

const OSSOS_Q = [
  ['ombroE', 'ombroD'], ['ombroE', 'cotoveloE'], ['cotoveloE', 'pulsoE'], ['ombroD', 'cotoveloD'], ['cotoveloD', 'pulsoD'],
  ['ombroE', 'quadrilE'], ['ombroD', 'quadrilD'], ['quadrilE', 'quadrilD'],
  ['quadrilE', 'joelhoE'], ['joelhoE', 'tornozeloE'], ['quadrilD', 'joelhoD'], ['joelhoD', 'tornozeloD'],
];
const OSSOS_I = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
];

function tracos(c, linhas, cabeca, raio, cor, espessura) {
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const passo of [0, 1]) {
    // primeiro o brilho largo, depois o miolo claro
    c.strokeStyle = passo ? '#ffffff' : cor;
    c.lineWidth = passo ? espessura * 0.35 : espessura;
    c.shadowColor = cor;
    c.shadowBlur = passo ? 0 : espessura * 2.2;
    c.globalAlpha = passo ? 0.85 : 1;
    c.beginPath();
    for (const [a, b] of linhas) {
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
    }
    if (cabeca) {
      c.moveTo(cabeca.x + raio, cabeca.y);
      c.arc(cabeca.x, cabeca.y, raio, 0, Math.PI * 2);
    }
    c.stroke();
  }
  c.restore();
}

/**
 * A pessoa vista pela câmera, como num espelho.
 * @param {object} q pontos filtrados do LeitorCorpo (x na escala do y, já espelhado)
 * @param {object} area { x, y, l, a } onde a imagem da câmera aparece na tela
 */
export function desenharPessoa(c, q, aspecto, area, cor, T) {
  if (!q) return;
  const P = (p) => ({ x: area.x + (p.x / aspecto) * area.l, y: area.y + p.y * area.a });
  const linhas = [];
  for (const [a, b] of OSSOS_Q) if (q[a] && q[b] && q[a].v > 0.3 && q[b].v > 0.3) linhas.push([P(q[a]), P(q[b])]);
  const raio = (T || 0.15) * 0.3 * area.a;
  tracos(c, linhas, q.nariz ? P(q.nariz) : null, raio, cor, Math.max(5, raio * 0.42));
}

/**
 * O boneco de js/motor/poses.js (unidade = tronco, y para cima).
 * (x, y) = ponto do chão embaixo do boneco; escala = pixels por tronco.
 */
export function desenharBoneco(c, corpo, x, y, escala, cor = CORES.amarelo, espessura = 5) {
  const P = (p) => ({ x: x + p.x * escala, y: y - p.y * escala });
  const linhas = OSSOS_I.map(([a, b]) => [P(corpo[a]), P(corpo[b])]);
  tracos(c, linhas, P(corpo[0]), escala * 0.2, cor, espessura);
}

// Limites do boneco, para centralizar os que ficam deitados.
export function centroDoBoneco(corpo) {
  const xs = [11, 12, 23, 24, 27, 28, 0].map((i) => corpo[i].x);
  return (Math.min(...xs) + Math.max(...xs)) / 2;
}
