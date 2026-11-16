// Depois da sessão: cada pessoa diz o esforço que sentiu (escala de Borg CR10), e a sessão é gravada.
import { LARGURA, CORES } from '../config.js';
import { texto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';

const NIVEIS = [
  { id: 1, rotulo: '1', sub: 'MUITO LEVE', cor: CORES.verde },
  { id: 3, rotulo: '3', sub: 'MODERADO', cor: CORES.ciano },
  { id: 5, rotulo: '5', sub: 'FORTE', cor: CORES.amarelo },
  { id: 7, rotulo: '7', sub: 'MUITO FORTE', cor: CORES.laranja },
  { id: 10, rotulo: '10', sub: 'MÁXIMO', cor: CORES.vermelho },
];

export class Esforco {
  /** dados: { sessao } */
  constructor(app, dados) {
    this.app = app;
    this.sessao = dados.sessao;
    this.esforcos = this.sessao.jogadores.map(() => null);
    // só pergunta para quem treinou o bastante para entrar no histórico
    const ativos = new Set(this.sessao.registros().map((r) => r.perfil));
    this.fila = this.sessao.jogadores.map((jog, j) => (ativos.has(jog.perfil.id) ? j : -1)).filter((j) => j >= 0);
    this.menu = new Menu(grade(NIVEIS.map((n) => ({ ...n, tam: 64 })), { colunas: 5, x: 60, y: 260, l: LARGURA - 120, a: 220, folga: 22 }));
    app.audio.tocar('menu');
    if (!this.fila.length) this.terminar();
    else app.audio.falar(`${this.sessao.jogadores[this.fila[0]].perfil.nome}, como foi o esforço?`);
  }

  terminar() {
    const app = this.app;
    const h = app.historico;
    const registros = this.sessao.registros(this.esforcos);
    // comparações com o que já estava gravado, antes de gravar a sessão nova
    const anteriores = registros.map((r) => ({
      recorde: h.recorde(r.perfil, r.plano),
      ritmos: Object.fromEntries(r.blocos.map((b) => [b.exercicio, h.ritmoAnterior(r.perfil, b.exercicio)])),
    }));
    for (const r of registros) h.adicionar(r);
    this.saiu = true;
    app.trocar('resultado', { sessao: this.sessao, registros, anteriores });
  }

  atualizar() {
    if (this.saiu) return;
    const b = this.menu.atualizar(this.app);
    if (!b) return;
    this.esforcos[this.fila.shift()] = b.id;
    if (this.fila.length) this.app.audio.falar(`${this.sessao.jogadores[this.fila[0]].perfil.nome}, como foi o esforço?`);
    else this.terminar();
  }

  desenhar(c) {
    this.app.fundo(0.5);
    if (!this.fila.length) return;
    const perfil = this.sessao.jogadores[this.fila[0]].perfil;
    texto(c, perfil.nome, LARGURA / 2, 80, { tam: 56, cor: perfil.cor, fonte: 'Audiowide', peso: 400 });
    texto(c, 'COMO FOI O ESFORÇO?', LARGURA / 2, 160, { tam: 36, cor: CORES.amarelo });
    texto(c, 'ESCALA DE ESFORÇO PERCEBIDO, DE 0 A 10', LARGURA / 2, 210, { tam: 17, cor: CORES.branco, brilho: 0, peso: 500 });
    this.menu.desenhar(c, this.app);
  }
}
