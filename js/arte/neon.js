// Desenho no estilo dos anos 80: céu roxo, sol listrado, grade até o horizonte, neon e cromado.
// Tudo é vetor em resolução cheia (nada de pixel grande).
import { LARGURA, ALTURA, CORES } from '../config.js';

export const TITULO = 'Audiowide';
export const TEXTO = 'Orbitron';
const HORIZONTE = 430;

let ceu = null; // o céu não muda: fica guardado

function desenharCeu() {
  const tela = document.createElement('canvas');
  tela.width = LARGURA;
  tela.height = ALTURA;
  const c = tela.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, HORIZONTE);
  g.addColorStop(0, '#0a0220');
  g.addColorStop(0.55, '#2a0a55');
  g.addColorStop(1, '#a01a8f');
  c.fillStyle = g;
  c.fillRect(0, 0, LARGURA, HORIZONTE);
  // estrelas
  let s = 11;
  const acaso = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    c.globalAlpha = 0.25 + acaso() * 0.6;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(acaso() * LARGURA, acaso() * 300, 0.6 + acaso() * 1.2, 0, 7);
    c.fill();
  }
  c.globalAlpha = 1;
  // sol listrado
  const sx = LARGURA / 2;
  const sy = 320;
  const r = 170;
  const gs = c.createLinearGradient(0, sy - r, 0, sy + r);
  gs.addColorStop(0, '#ffe14a');
  gs.addColorStop(0.5, '#ff8a3c');
  gs.addColorStop(1, '#ff2bd6');
  c.save();
  c.beginPath();
  c.rect(0, 0, LARGURA, HORIZONTE);
  c.clip();
  c.shadowColor = '#ff5fb0';
  c.shadowBlur = 60;
  c.fillStyle = gs;
  c.beginPath();
  c.arc(sx, sy, r, 0, 7);
  c.fill();
  c.shadowBlur = 0;
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) c.fillRect(sx - r, sy + 12 + i * 22, r * 2, 3 + i * 2.2);
  c.restore();
  // o céu aparece de novo atrás das listras
  c.globalCompositeOperation = 'destination-over';
  c.fillStyle = g;
  c.fillRect(0, 0, LARGURA, HORIZONTE);
  c.globalCompositeOperation = 'source-over';
  // montanhas
  c.fillStyle = '#16042f';
  c.strokeStyle = CORES.ciano;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, HORIZONTE);
  const picos = [0, 60, 120, 40, 200, 90, 300, 20, 420, 0, 860, 0, 950, 30, 1040, 100, 1130, 50, 1210, 110, 1280, 70];
  for (let i = 0; i < picos.length; i += 2) c.lineTo(picos[i], HORIZONTE - picos[i + 1]);
  c.lineTo(LARGURA, HORIZONTE);
  c.closePath();
  c.fill();
  c.stroke();
  return tela;
}

/** Fundo completo. `escuro` (0..1) apaga o fundo atrás dos painéis. */
export function fundo(c, t, escuro = 0) {
  if (!ceu) ceu = desenharCeu();
  c.drawImage(ceu, 0, 0);
  // chão
  const g = c.createLinearGradient(0, HORIZONTE, 0, ALTURA);
  g.addColorStop(0, '#3a0a66');
  g.addColorStop(1, '#0c0220');
  c.fillStyle = g;
  c.fillRect(0, HORIZONTE, LARGURA, ALTURA - HORIZONTE);
  c.save();
  c.strokeStyle = CORES.rosa;
  c.lineWidth = 1.5;
  c.globalAlpha = 0.7;
  c.beginPath();
  // linhas que fogem para o horizonte
  for (let i = -14; i <= 14; i++) {
    c.moveTo(LARGURA / 2 + i * 26, HORIZONTE);
    c.lineTo(LARGURA / 2 + i * 190, ALTURA);
  }
  // linhas que vêm na direção da tela
  const fase = (t * 0.35) % 1;
  for (let i = 0; i < 12; i++) {
    const k = (i + fase) / 12;
    const y = HORIZONTE + (ALTURA - HORIZONTE) * k * k;
    c.moveTo(0, y);
    c.lineTo(LARGURA, y);
  }
  c.stroke();
  c.restore();
  c.fillStyle = CORES.rosa;
  c.fillRect(0, HORIZONTE - 1, LARGURA, 2);
  if (escuro > 0) {
    c.fillStyle = `rgba(10,2,28,${escuro})`;
    c.fillRect(0, 0, LARGURA, ALTURA);
  }
}

// Linhas finas de TV antiga por cima de tudo.
let linhas = null;
export function linhasDeTv(c) {
  if (!linhas) {
    const tela = document.createElement('canvas');
    tela.width = 4;
    tela.height = 4;
    const k = tela.getContext('2d');
    k.fillStyle = 'rgba(0,0,0,0.16)';
    k.fillRect(0, 2, 4, 1.4);
    linhas = c.createPattern(tela, 'repeat');
  }
  c.fillStyle = linhas;
  c.fillRect(0, 0, LARGURA, ALTURA);
  const v = c.createRadialGradient(LARGURA / 2, ALTURA / 2, ALTURA * 0.45, LARGURA / 2, ALTURA / 2, ALTURA * 0.95);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.45)');
  c.fillStyle = v;
  c.fillRect(0, 0, LARGURA, ALTURA);
}

/** Texto com brilho de neon. o: { tam, cor, fonte, alinhar, brilho, peso, largura (aperta para caber) } */
export function texto(c, str, x, y, o = {}) {
  const tam = o.tam || 24;
  c.save();
  c.font = `${o.peso || 700} ${tam}px ${o.fonte || TEXTO}, sans-serif`;
  c.textAlign = o.alinhar || 'center';
  c.textBaseline = o.base || 'middle';
  if (o.largura) {
    const l = c.measureText(str).width;
    if (l > o.largura) {
      const k = o.largura / l;
      c.translate(x, y);
      c.scale(k, 1);
      c.translate(-x, -y);
    }
  }
  const cor = o.cor || CORES.branco;
  if (o.brilho !== 0) {
    c.shadowColor = o.corBrilho || cor;
    c.shadowBlur = o.brilho ?? 12;
  }
  c.fillStyle = cor;
  c.fillText(str, x, y);
  c.restore();
}

// Texto com várias linhas: quebra nas palavras para caber em `largura`.
export function paragrafo(c, str, x, y, largura, o = {}) {
  const tam = o.tam || 20;
  c.save();
  c.font = `${o.peso || 700} ${tam}px ${o.fonte || TEXTO}, sans-serif`;
  const linhasTexto = [];
  let atual = '';
  for (const palavra of str.split(' ')) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (c.measureText(tentativa).width > largura && atual) {
      linhasTexto.push(atual);
      atual = palavra;
    } else atual = tentativa;
  }
  if (atual) linhasTexto.push(atual);
  c.restore();
  linhasTexto.forEach((l, i) => texto(c, l, x, y + i * tam * 1.25, o));
  return linhasTexto.length;
}

// Letreiro cromado dos anos 80.
export function cromado(c, str, x, y, tam) {
  c.save();
  c.font = `400 ${tam}px ${TITULO}, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.shadowColor = CORES.rosa;
  c.shadowBlur = 30;
  c.strokeStyle = CORES.rosa;
  c.lineWidth = tam * 0.09;
  c.strokeText(str, x, y);
  c.shadowBlur = 0;
  c.strokeStyle = '#1a0540';
  c.lineWidth = tam * 0.045;
  c.strokeText(str, x, y);
  const g = c.createLinearGradient(0, y - tam * 0.5, 0, y + tam * 0.5);
  g.addColorStop(0, '#eaffff');
  g.addColorStop(0.42, '#21f6ff');
  g.addColorStop(0.5, '#2b1a8f');
  g.addColorStop(0.56, '#ff8a3c');
  g.addColorStop(1, '#ffe14a');
  c.fillStyle = g;
  c.fillText(str, x, y);
  c.restore();
}

function caminho(c, x, y, l, a, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + l - r, y);
  c.quadraticCurveTo(x + l, y, x + l, y + r);
  c.lineTo(x + l, y + a - r);
  c.quadraticCurveTo(x + l, y + a, x + l - r, y + a);
  c.lineTo(x + r, y + a);
  c.quadraticCurveTo(x, y + a, x, y + a - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

/** Painel escuro com borda de neon. o: { cor, fundo, brilho, raio, espessura } */
export function painel(c, x, y, l, a, o = {}) {
  const cor = o.cor || CORES.ciano;
  c.save();
  caminho(c, x, y, l, a, o.raio ?? 14);
  c.fillStyle = o.fundo || 'rgba(14,4,40,0.78)';
  c.fill();
  c.shadowColor = cor;
  c.shadowBlur = o.brilho ?? 16;
  c.strokeStyle = cor;
  c.lineWidth = o.espessura || 3;
  c.stroke();
  c.restore();
}

export function barra(c, x, y, l, a, valor, cor) {
  c.save();
  caminho(c, x, y, l, a, a / 2);
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fill();
  const v = Math.max(0, Math.min(1, valor));
  if (v > 0.01) {
    caminho(c, x, y, Math.max(a, l * v), a, a / 2);
    c.shadowColor = cor;
    c.shadowBlur = 10;
    c.fillStyle = cor;
    c.fill();
  }
  c.restore();
}

// Anel que enche no sentido do relógio.
export function anel(c, x, y, r, valor, cor, espessura = 8) {
  c.save();
  c.lineWidth = espessura;
  c.strokeStyle = 'rgba(255,255,255,0.15)';
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = cor;
  c.shadowColor = cor;
  c.shadowBlur = 14;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(1, valor)));
  c.stroke();
  c.restore();
}

export const tempoTexto = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
export const kcalTexto = (k) => (k < 10 ? k.toFixed(1).replace('.', ',') : String(Math.round(k)));
