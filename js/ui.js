// Botões escolhidos com a mão (cursor que espera sobre o botão), com o ponteiro ou com o teclado.
import { LARGURA, ALTURA, CORES } from './config.js';
import { painel, texto, anel } from './arte/neon.js';

export class Menu {
  /** botoes: [{ id, x, y, l, a, rotulo, sub, cor, desligado, marcado }] */
  constructor(botoes = [], o = {}) {
    this.botoes = botoes;
    this.foco = -1; // botão escolhido pelo teclado
    this.tempo = o.tempo; // segundos de espera da mão (padrão do cursor)
    this.voltar = o.voltar || null; // id do botão que a tecla Esc escolhe
  }

  /** @returns {object|null} o botão escolhido neste quadro */
  atualizar(app) {
    const e = app.entrada;
    let escolhido = null;
    for (let i = 0; i < e.n; i++) {
      const b = e.j[i].cursor.escolher(this.botoes, LARGURA, ALTURA, app.t, this.tempo);
      if (b && !escolhido) escolhido = b;
    }
    const ativos = this.botoes.filter((b) => !b.desligado);
    // ponteiro
    const p = e.ponteiro;
    const sob = p.dentro ? ativos.find((b) => p.x >= b.x && p.x <= b.x + b.l && p.y >= b.y && p.y <= b.y + b.a) : null;
    this.sobPonteiro = sob || null;
    if (p.clicou && sob) escolhido = sob;
    // teclado
    const dir = e.tecla('ArrowRight') ? [1, 0] : e.tecla('ArrowLeft') ? [-1, 0] : e.tecla('ArrowDown') ? [0, 1] : e.tecla('ArrowUp') ? [0, -1] : null;
    if (dir && ativos.length) {
      const atual = this.botoes[this.foco];
      if (!atual || atual.desligado) this.foco = this.botoes.indexOf(ativos[0]);
      else {
        const cx = atual.x + atual.l / 2;
        const cy = atual.y + atual.a / 2;
        let melhor = null;
        let nota = Infinity;
        for (const b of ativos) {
          if (b === atual) continue;
          const dx = b.x + b.l / 2 - cx;
          const dy = b.y + b.a / 2 - cy;
          const frente = dx * dir[0] + dy * dir[1];
          if (frente <= 1) continue;
          const lado = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
          const n = frente + lado * 2.5;
          if (n < nota) {
            nota = n;
            melhor = b;
          }
        }
        if (melhor) this.foco = this.botoes.indexOf(melhor);
      }
      app.audio.efeito('foco');
    }
    if (e.tecla('Enter', 'Space', 'NumpadEnter')) {
      const b = this.botoes[this.foco];
      if (b && !b.desligado) escolhido = b;
      else if (ativos.length && this.foco < 0) this.foco = this.botoes.indexOf(ativos[0]);
    }
    if (this.voltar && e.tecla('Escape', 'Backspace')) escolhido = this.botoes.find((b) => b.id === this.voltar && !b.desligado) || escolhido;
    if (escolhido) app.audio.efeito('escolher');
    return escolhido;
  }

  desenhar(c, app) {
    const e = app.entrada;
    this.botoes.forEach((b, i) => {
      let progresso = 0;
      let sob = this.sobPonteiro === b || this.foco === i;
      for (let k = 0; k < e.n; k++) {
        const cur = e.j[k].cursor;
        if (cur.alvo === b) {
          sob = true;
          progresso = Math.max(progresso, cur.progresso);
        }
      }
      desenharBotao(c, b, sob, progresso);
    });
  }
}

export function desenharBotao(c, b, sob, progresso = 0) {
  const cor = b.desligado ? '#5a4a7a' : b.cor || CORES.ciano;
  const cresce = sob && !b.desligado ? 5 : 0;
  const x = b.x - cresce;
  const y = b.y - cresce;
  const l = b.l + cresce * 2;
  const a = b.a + cresce * 2;
  painel(c, x, y, l, a, {
    cor,
    fundo: b.marcado ? 'rgba(90,20,120,0.85)' : sob && !b.desligado ? 'rgba(50,14,96,0.9)' : 'rgba(14,4,40,0.8)',
    brilho: sob && !b.desligado ? 30 : b.desligado ? 0 : 12,
    espessura: b.marcado ? 5 : 3,
  });
  if (progresso > 0) {
    // a borda enche enquanto a mão espera
    c.save();
    c.beginPath();
    c.rect(x, y + a - 10, l * progresso, 10);
    c.clip();
    painel(c, x, y, l, a, { cor: CORES.amarelo, fundo: CORES.amarelo, brilho: 20 });
    c.restore();
  }
  const tam = b.tam || Math.min(34, a * 0.3);
  const cy = y + a / 2 - (b.sub ? tam * 0.4 : 0);
  texto(c, b.rotulo, x + l / 2, cy, { tam, cor: b.desligado ? '#7a6a9a' : CORES.branco, corBrilho: cor, largura: l - 28, brilho: b.desligado ? 0 : 10 });
  if (b.sub) texto(c, b.sub, x + l / 2, cy + tam * 0.95, { tam: Math.max(13, tam * 0.52), cor, largura: l - 28, brilho: 0, peso: 500 });
}

// Cursor da mão de cada pessoa, com o anel da espera.
export function desenharCursores(c, app) {
  const e = app.entrada;
  for (let i = 0; i < e.n; i++) {
    const cur = e.j[i].cursor;
    if (!cur.ativo) continue;
    const cor = (app.jogadores[i] && app.jogadores[i].cor) || CORES.jogadores[i];
    const x = cur.x * LARGURA;
    const y = cur.y * ALTURA;
    c.save();
    c.shadowColor = cor;
    c.shadowBlur = 22;
    c.fillStyle = cor;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(x, y, 13, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(x, y, 5, 0, Math.PI * 2);
    c.fill();
    c.restore();
    anel(c, x, y, 27, cur.alvo ? cur.progresso : 0, CORES.amarelo, 6);
  }
}

// Monta uma grade de botões centralizada.
export function grade(itens, { colunas, x = 80, y = 150, l = LARGURA - 160, a = 440, folga = 24 } = {}) {
  const linhas = Math.ceil(itens.length / colunas);
  const bl = (l - folga * (colunas - 1)) / colunas;
  const ba = (a - folga * (linhas - 1)) / linhas;
  return itens.map((item, i) => ({
    x: x + (i % colunas) * (bl + folga),
    y: y + Math.floor(i / colunas) * (ba + folga),
    l: bl,
    a: ba,
    ...item,
  }));
}
