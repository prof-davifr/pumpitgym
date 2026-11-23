// Opinião: depois de alguns minutos de treino, pede um voto com três rostos e mostra o QR code
// do formulário para quem quiser escrever mais. Votar ou pular segue para a tela de destino.
import { LARGURA, CORES } from '../config.js';
import { texto, painel } from '../arte/neon.js';
import { Menu } from '../ui.js';
import { VOTOS, desenharQr, desenharRosto } from '../motor/opiniao.js';

const ESPERA_VOTO = 30; // segundos sem voto: o jogo segue sozinho
const ESPERA_QR = 25; // depois do voto, o QR fica na tela para quem quer escrever
const MODULO = 6; // pixels por módulo do QR
const PX = 9; // pixels por ponto dos rostos

export class Opiniao {
  /** dados: { destino: { nome, dados }, contexto } */
  constructor(app, dados = {}) {
    this.app = app;
    this.destino = dados.destino || { nome: 'menu', dados: {} };
    this.contexto = dados.contexto || {};
    this.t = 0;
    this.voto = null;
    this.tVoto = 0;
    const l = 180;
    const folga = 24;
    this.cx = 420;
    const x0 = this.cx - (l * VOTOS.length + folga * (VOTOS.length - 1)) / 2;
    const botoes = VOTOS.map((v, i) => ({ id: v.id, x: x0 + i * (l + folga), y: 200, l, a: 200, rotulo: '', cor: v.cor }));
    botoes.push({ id: 'pular', x: this.cx - 150, y: 470, l: 300, a: 70, rotulo: 'AGORA NÃO', cor: CORES.roxo, tam: 24 });
    this.menu = new Menu(botoes, { voltar: 'pular' });
    this.menuFim = new Menu([{ id: 'ok', x: this.cx - 170, y: 470, l: 340, a: 76, rotulo: 'CONTINUAR', cor: CORES.verde, tam: 28 }], { voltar: 'ok' });
    this.menuFim.foco = 0; // Enter já continua
    this.semLinhasDeTv = true; // as linhas por cima do QR atrapalham a leitura no celular
  }

  seguir() {
    if (this.saiu) return;
    this.saiu = true;
    this.app.trocar(this.destino.nome, this.destino.dados);
  }

  atualizar(dt) {
    this.t += dt;
    if (this.voto) {
      this.tVoto += dt;
      if ((this.tVoto > 1 && this.menuFim.atualizar(this.app)) || this.tVoto > ESPERA_QR) this.seguir();
      return;
    }
    const b = this.menu.atualizar(this.app);
    if ((b && b.id === 'pular') || this.t > ESPERA_VOTO) {
      this.app.opiniao.pular();
      this.seguir();
    } else if (b) {
      this.voto = b.id;
      this.app.opiniao.votar(this.voto, this.contexto);
    }
  }

  desenhar(c) {
    this.app.fundo(0.55);
    const qr = this.app.opiniao.qr(this.voto);
    const lado = (qr.n + 8) * MODULO;
    const qx = LARGURA - lado - 70;
    const qy = 190;
    const cqx = qx + lado / 2;
    texto(c, 'QUER CONTAR MAIS?', cqx, 120, { tam: 30, cor: CORES.amarelo });
    texto(c, 'APONTE A CÂMERA DO CELULAR', cqx, 158, { tam: 18, cor: CORES.branco, brilho: 0, peso: 500 });
    painel(c, qx - 10, qy - 10, lado + 20, lado + 20, { cor: CORES.ciano, fundo: '#ffffff', brilho: 18 });
    desenharQr(c, qr, qx, qy, MODULO, 0.6);

    if (this.voto) {
      texto(c, 'OBRIGADO!', this.cx, 130, { tam: 64, cor: CORES.rosa, fonte: 'Audiowide', peso: 400 });
      const y = 260 - Math.round(Math.abs(Math.sin(this.tVoto * 5)) * 16);
      desenharRosto(c, this.voto, this.cx - (13 * 14) / 2, y, 14, { sobra: 0.6 });
      if (this.tVoto > 1) this.menuFim.desenhar(c, this.app);
      return;
    }

    texto(c, 'GOSTOU DO TREINO?', this.cx, 130, { tam: 52, cor: CORES.rosa, fonte: 'Audiowide', peso: 400 });
    this.menu.desenhar(c, this.app);
    for (const b of this.menu.botoes) {
      const v = VOTOS.find((x) => x.id === b.id);
      if (!v) continue;
      desenharRosto(c, v.id, b.x + (b.l - 13 * PX) / 2, b.y + 22, PX, { sobra: 0.6 });
      texto(c, v.texto.toUpperCase(), b.x + b.l / 2, b.y + b.a - 28, { tam: 18, cor: v.cor, brilho: 0 });
    }
    texto(c, 'LEVANTE A MÃO E SEGURE SOBRE UM ROSTO', this.cx, 610, { tam: 22, cor: CORES.amarelo });
  }
}
