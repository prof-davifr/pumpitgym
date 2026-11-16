// Calibração: cada pessoa fica em pé, com o corpo inteiro na imagem. Com duas pessoas, confere o espaço.
import { LARGURA, CORES } from '../config.js';
import { texto, barra, painel } from '../arte/neon.js';
import { Menu } from '../ui.js';

export class Calibracao {
  constructor(app) {
    this.app = app;
    this.pronto = 0; // segundos com tudo certo
    this.menu = new Menu([{ id: 'voltar', x: 30, y: 620, l: 200, a: 72, rotulo: 'VOLTAR', cor: CORES.roxo, tam: 22 }], { voltar: 'voltar' });
    app.entrada.recalibrar();
    this.falou = false;
  }

  atualizar(dt) {
    const app = this.app;
    const e = app.entrada;
    if (!this.falou && app.audio.ctx) {
      app.audio.falar('Fique em pé, com o corpo inteiro na imagem.');
      this.falou = true;
    }
    if (this.menu.atualizar(app)) return app.trocar('jogadores');
    const todos = app.jogadores.every((_, i) => e.j[i].presente && e.j[i].calibrado);
    const espaco = e.n === 2 ? e.espaco : null;
    const perto = espaco && espaco.nivel === 'perto';
    this.perto = perto;
    this.pronto = todos && !perto ? this.pronto + dt : 0;
    if (this.pronto > 1.2) {
      app.audio.efeito('escolher');
      app.trocar('menu');
    }
  }

  desenhar(c) {
    const app = this.app;
    const e = app.entrada;
    app.fundo(0.55);
    app.desenharVideo(0.55);
    app.desenharPessoas();
    texto(c, 'FIQUE EM PÉ, COM O CORPO INTEIRO NA IMAGEM', LARGURA / 2, 50, { tam: 30, cor: CORES.amarelo });
    const n = app.jogadores.length;
    app.jogadores.forEach((p, i) => {
      const x = n === 1 ? LARGURA / 2 - 190 : i === 0 ? 60 : LARGURA - 440;
      const jog = e.j[i];
      painel(c, x, 90, 380, 96, { cor: p.cor });
      const estado = !jog.presente ? 'NÃO VEJO VOCÊ' : jog.calibrado ? 'PRONTO' : 'FIQUE PARADO';
      texto(c, `${p.nome}: ${estado}`, x + 190, 122, { tam: 22, cor: p.cor, largura: 350 });
      barra(c, x + 24, 150, 332, 14, jog.leitor.progressoCalibracao, jog.calibrado ? CORES.verde : p.cor);
    });
    if (this.perto) {
      painel(c, LARGURA / 2 - 300, 300, 600, 120, { cor: CORES.vermelho, fundo: 'rgba(60,0,20,0.85)' });
      texto(c, 'AFASTEM-SE UM DO OUTRO', LARGURA / 2, 345, { tam: 36, cor: CORES.vermelho });
      texto(c, 'CADA UM PRECISA DE ESPAÇO PARA ABRIR OS BRAÇOS', LARGURA / 2, 390, { tam: 17, cor: CORES.branco, brilho: 0, peso: 500 });
    }
    this.menu.desenhar(c, app);
  }
}
