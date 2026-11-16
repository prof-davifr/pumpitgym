// Peso de cada pessoa, para a estimativa das calorias.
import { LARGURA, CORES } from '../config.js';
import { PESO_PADRAO } from '../treino/perfis.js';
import { texto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';

export class Peso {
  /** dados: { perfis: [ids], depois: nome da cena seguinte } */
  constructor(app, dados) {
    this.app = app;
    this.fila = [...dados.perfis];
    this.depois = dados.depois || 'menu';
    const botoes = grade(
      [{ id: -5, rotulo: '−5' }, { id: -1, rotulo: '−1' }, { id: 1, rotulo: '+1' }, { id: 5, rotulo: '+5' }].map((b) => ({ ...b, tam: 48, cor: CORES.ciano })),
      { colunas: 4, x: 160, y: 380, l: LARGURA - 320, a: 120, folga: 30 },
    );
    this.menu = new Menu([...botoes, { id: 'ok', x: LARGURA / 2 - 170, y: 550, l: 340, a: 100, rotulo: 'OK', cor: CORES.verde, tam: 44 }], { tempo: 0.9, voltar: 'ok' });
    this.abrir();
  }

  abrir() {
    this.perfil = this.app.historico.perfil(this.fila[0]);
    this.valor = this.perfil.pesoKg || PESO_PADRAO;
  }

  atualizar() {
    const b = this.menu.atualizar(this.app);
    if (!b) return;
    if (b.id === 'ok') {
      this.perfil.pesoKg = this.valor;
      this.app.historico.salvar();
      this.fila.shift();
      if (this.fila.length) this.abrir();
      else this.app.trocar(this.depois);
    } else {
      this.valor = Math.max(30, Math.min(180, this.valor + b.id));
      // a mão pode ficar no botão para continuar a mudar
      for (const j of this.app.entrada.j) if (j.cursor.alvo === b) j.cursor.desde = this.app.t;
    }
  }

  desenhar(c) {
    this.app.fundo(0.45);
    texto(c, `PESO DE ${this.perfil.nome}`, LARGURA / 2, 90, { tam: 48, cor: this.perfil.cor, fonte: 'Audiowide', peso: 400 });
    texto(c, 'SERVE PARA ESTIMAR AS CALORIAS. FICA GUARDADO SÓ NESTE NAVEGADOR.', LARGURA / 2, 145, { tam: 18, cor: CORES.branco, brilho: 0, peso: 500 });
    texto(c, `${this.valor} KG`, LARGURA / 2, 265, { tam: 120, cor: CORES.amarelo, fonte: 'Audiowide', peso: 400, brilho: 24 });
    this.menu.desenhar(c, this.app);
  }
}
