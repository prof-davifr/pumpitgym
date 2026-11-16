// Abertura: liga a câmera e espera a primeira mão levantada.
import { LARGURA, CORES } from '../config.js';
import { cromado, texto } from '../arte/neon.js';
import { Menu } from '../ui.js';

export class Titulo {
  constructor(app) {
    this.app = app;
    this.menu = new Menu([{ id: 'comecar', x: LARGURA / 2 - 210, y: 440, l: 420, a: 110, rotulo: 'COMEÇAR', cor: CORES.rosa, tam: 44 }]);
    app.entrada.iniciar();
    app.audio.tocar('menu');
  }

  atualizar() {
    if (this.menu.atualizar(this.app)) this.app.trocar('jogadores');
  }

  desenhar(c) {
    const app = this.app;
    app.fundo();
    app.desenharPessoas();
    cromado(c, 'PUMP IT GYM', LARGURA / 2, 170, 124);
    texto(c, 'PERNAS FORTES  ·  DANÇA  ·  SEM EQUIPAMENTO', LARGURA / 2, 280, { tam: 26, cor: CORES.ciano });
    this.menu.desenhar(c, app);
    const estado = app.entrada.estado;
    const pisca = Math.sin(app.t * 4) > -0.3;
    if (estado === 'pronta') {
      if (pisca) texto(c, 'LEVANTE A MÃO E SEGURE SOBRE O BOTÃO', LARGURA / 2, 610, { tam: 26, cor: CORES.amarelo });
      texto(c, 'FIQUE A 2 OU 3 METROS DA CÂMERA, COM O CORPO INTEIRO NA IMAGEM', LARGURA / 2, 660, { tam: 17, cor: CORES.branco, brilho: 0, peso: 500 });
    } else if (estado === 'erro') {
      texto(c, app.entrada.camera.erro, LARGURA / 2, 610, { tam: 28, cor: CORES.vermelho });
      texto(c, 'LIBERE A CÂMERA NO NAVEGADOR E RECARREGUE A PÁGINA. O MOUSE E O TECLADO FUNCIONAM.', LARGURA / 2, 660, { tam: 17, cor: CORES.branco, brilho: 0, peso: 500 });
    } else {
      texto(c, `LIGANDO A CÂMERA${'.'.repeat(1 + (Math.floor(app.t * 2) % 3))}`, LARGURA / 2, 610, { tam: 26, cor: CORES.amarelo });
      texto(c, 'O NAVEGADOR PEDE A SUA PERMISSÃO. A IMAGEM NÃO SAI DESTE APARELHO.', LARGURA / 2, 660, { tam: 17, cor: CORES.branco, brilho: 0, peso: 500 });
    }
  }
}
