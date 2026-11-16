// Cursor da mão: a mão levantada de uma pessoa vira um cursor na tela.
// Ficar com a mão parada sobre um botão por um tempo confirma a escolha.
// Lógica pura (sem DOM), assim os testes rodam no Node.
import { CURSOR } from '../config.js';
import { FiltroUmEuro } from './gestos.js';

const limitar = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export class CursorMao {
  constructor(c = CURSOR) {
    this.c = c;
    this.fx = new FiltroUmEuro(1.2, 1.5);
    this.fy = new FiltroUmEuro(1.2, 1.5);
    this.reiniciar();
  }

  reiniciar() {
    this.ativo = false;
    this.x = 0.5; // posição na tela, de 0 a 1
    this.y = 0.5;
    this.mao = null; // 'E' ou 'D'
    this.alvo = null; // botão sob o cursor
    this.desde = 0;
    this.progresso = 0; // 0..1 até confirmar
    this.fx.reiniciar();
    this.fy.reiniciar();
  }

  /**
   * @param {object|null} q pontos filtrados do LeitorCorpo (x espelhado, na escala do y)
   * @param {object} ombro meio dos ombros
   * @param {number} T comprimento do tronco
   * @param {number} t tempo em segundos
   */
  atualizar(q, ombro, T, t) {
    if (!q || !ombro || !T) {
      this.ativo = false;
      this.mao = null;
      return this;
    }
    const c = this.c;
    // altura de cada mão em relação aos ombros (positivo = abaixo)
    const maos = [['E', q.pulsoE], ['D', q.pulsoD]]
      .filter(([, p]) => p && p.ok)
      .map(([nome, p]) => ({ nome, p, dy: (p.y - ombro.y) / T }));
    const atual = maos.find((m) => m.nome === this.mao);
    let escolhida = atual && atual.dy < c.soltar ? atual : null;
    // troca de mão só se a outra estiver bem mais alta
    for (const m of maos) {
      if (m.dy >= c.baixo) continue;
      if (!escolhida || m.dy < escolhida.dy - 0.35) escolhida = m;
    }
    if (!escolhida) {
      this.ativo = false;
      this.mao = null;
      this.fx.reiniciar();
      this.fy.reiniciar();
      return this;
    }
    if (escolhida.nome !== this.mao) {
      this.fx.reiniciar();
      this.fy.reiniciar();
    }
    this.mao = escolhida.nome;
    this.ativo = true;
    const dx = (escolhida.p.x - ombro.x) / T;
    const x = limitar((dx + c.largura) / (2 * c.largura));
    const y = limitar((escolhida.dy + c.topo) / (c.topo + c.baixo));
    this.x = this.fx.filtrar(x, t);
    this.y = this.fy.filtrar(y, t);
    return this;
  }

  /**
   * Diz qual botão está sob o cursor e se a espera terminou.
   * @param {Array} botoes [{ x, y, l, a }] em unidades da tela
   * @returns {object|null} o botão confirmado neste quadro
   */
  escolher(botoes, largura, altura, t, tempo = this.c.tempo) {
    let sob = null;
    if (this.ativo) {
      const px = this.x * largura;
      const py = this.y * altura;
      sob = botoes.find((b) => !b.desligado && px >= b.x && px <= b.x + b.l && py >= b.y && py <= b.y + b.a) || null;
    }
    if (sob !== this.alvo) {
      this.alvo = sob;
      this.desde = t;
      this.progresso = 0;
      return null;
    }
    if (!sob) return null;
    this.progresso = limitar((t - this.desde) / tempo);
    if (this.progresso >= 1) {
      // precisa sair do botão para escolher de novo
      this.desde = Infinity;
      this.progresso = 0;
      return sob;
    }
    return null;
  }
}
