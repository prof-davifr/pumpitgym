// Quem vai treinar: uma ou duas pessoas.
import { LARGURA, CORES } from '../config.js';
import { texto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';

export class Jogadores {
  constructor(app) {
    this.app = app;
    this.escolhidos = []; // ids, na ordem: a primeira pessoa fica à esquerda
    const cartoes = grade(
      app.historico.perfis.map((p) => ({ id: p.id, rotulo: p.nome, cor: p.cor, tam: 44 })),
      { colunas: 3, x: 110, y: 170, l: LARGURA - 220, a: 250, folga: 40 },
    );
    this.pronto = { id: 'pronto', x: LARGURA / 2 - 200, y: 500, l: 400, a: 110, rotulo: 'PRONTO', cor: CORES.verde, tam: 40, desligado: true };
    this.menu = new Menu([...cartoes, this.pronto], { voltar: 'pronto' });
    app.audio.tocar('menu');
  }

  atualizar() {
    const app = this.app;
    const b = this.menu.atualizar(app);
    if (!b) return;
    if (b.id === 'pronto') {
      app.jogadores = this.escolhidos.map((id) => app.historico.perfil(id));
      app.entrada.definirJogadores(app.jogadores.length);
      const semPeso = app.jogadores.filter((p) => !p.pesoKg).map((p) => p.id);
      if (semPeso.length) app.trocar('peso', { perfis: semPeso, depois: 'calibracao' });
      else app.trocar('calibracao');
      return;
    }
    const i = this.escolhidos.indexOf(b.id);
    if (i >= 0) this.escolhidos.splice(i, 1);
    else {
      if (this.escolhidos.length === 2) this.escolhidos.shift();
      this.escolhidos.push(b.id);
    }
    for (const botao of this.menu.botoes) {
      const k = this.escolhidos.indexOf(botao.id);
      botao.marcado = k >= 0;
      if (botao.id !== 'pronto') botao.sub = k < 0 ? '' : this.escolhidos.length === 1 ? 'VAI TREINAR' : k === 0 ? 'FICA À ESQUERDA' : 'FICA À DIREITA';
    }
    this.pronto.desligado = this.escolhidos.length === 0;
  }

  desenhar(c) {
    this.app.fundo(0.35);
    texto(c, 'QUEM VAI TREINAR?', LARGURA / 2, 80, { tam: 52, cor: CORES.amarelo, fonte: 'Audiowide', peso: 400 });
    texto(c, 'ESCOLHA UMA OU DUAS PESSOAS', LARGURA / 2, 130, { tam: 20, cor: CORES.ciano, brilho: 0 });
    this.menu.desenhar(c, this.app);
    if (this.escolhidos.length === 2) texto(c, 'DUAS PESSOAS: FIQUEM LADO A LADO, COM ESPAÇO PARA ABRIR OS BRAÇOS', LARGURA / 2, 660, { tam: 18, cor: CORES.branco, brilho: 0, peso: 500 });
  }
}
