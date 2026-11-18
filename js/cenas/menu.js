// Menu principal.
import { LARGURA, CORES, opcoes } from '../config.js';
import { treinoDoDia, sessaoDeDanca, desafioDasPernas, testeDe30s, duracaoDoPlano } from '../treino/plano.js';
import { texto, kcalTexto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';
import { botaoSair, escolherSair, atualizarBotaoSair } from '../motor/sair.js';

export class MenuPrincipal {
  constructor(app) {
    this.app = app;
    const h = app.historico;
    const perfis = app.jogadores;
    this.planos = {
      treino: () => treinoDoDia(perfis, { voltas: opcoes.voltas, chao: opcoes.chao }),
      danca: () => sessaoDeDanca(perfis),
      desafio: () => desafioDasPernas(perfis),
      teste30: () => testeDe30s(perfis),
    };
    const recorde = (plano) => {
      const r = perfis.map((p) => h.recorde(p.id, plano)).filter((x) => x > 0);
      return r.length ? `RECORDE: ${Math.max(...r)}` : 'SEM RECORDE';
    };
    const minutos = Math.round(duracaoDoPlano(this.planos.treino()) / 60);
    const itens = [
      { id: 'treino', rotulo: 'TREINO DO DIA', sub: `${minutos} MINUTOS · PERNAS E AERÓBICO`, cor: CORES.rosa },
      { id: 'danca', rotulo: 'DANÇA', sub: 'IMITE AS POSES NA BATIDA', cor: CORES.ciano },
      { id: 'desafio', rotulo: 'DESAFIO DAS PERNAS', sub: `AGACHAMENTOS EM 60 S · ${recorde('desafio')}`, cor: CORES.amarelo },
      { id: 'teste30', rotulo: 'TESTE DE 30 S', sub: `SENTAR E LEVANTAR DA CADEIRA · ${recorde('teste30')}`, cor: CORES.laranja },
      { id: 'evolucao', rotulo: 'EVOLUÇÃO', sub: 'CALORIAS E SESSÕES DE CADA PESSOA', cor: CORES.verde },
      { id: 'opcoes', rotulo: 'OPÇÕES', sub: 'PESO, CUIDADOS, MÚSICA, DADOS', cor: CORES.roxo },
    ];
    const botoes = grade(itens, { colunas: 3, x: 60, y: 170, l: LARGURA - 120, a: 380, folga: 28 });
    botoes.push({ id: 'jogadores', x: LARGURA / 2 - 400, y: 600, l: 380, a: 76, rotulo: 'TROCAR AS PESSOAS', cor: CORES.roxo, tam: 22 });
    this.sair = botaoSair(LARGURA / 2 + 20, 600, 380, 76);
    botoes.push(this.sair);
    this.menu = new Menu(botoes, { voltar: 'jogadores' });
    app.audio.tocar('menu');
  }

  atualizar() {
    const app = this.app;
    const b = this.menu.atualizar(app);
    if (b && b.id === 'sair') escolherSair(b, app.t);
    atualizarBotaoSair(this.sair, app.t);
    if (!b || b.id === 'sair') return;
    if (this.planos[b.id]) app.trocar('sessao', { plano: this.planos[b.id]() });
    else app.trocar(b.id);
  }

  desenhar(c) {
    const app = this.app;
    app.fundo(0.4);
    texto(c, 'PUMP IT GYM', LARGURA / 2, 52, { tam: 44, cor: CORES.rosa, fonte: 'Audiowide', peso: 400 });
    const hoje = app.jogadores.map((p) => `${p.nome}: ${kcalTexto(app.historico.porDia(p.id, 1)[0].kcal)} KCAL HOJE`).join('     ');
    texto(c, hoje, LARGURA / 2, 115, { tam: 22, cor: CORES.branco, largura: LARGURA - 120 });
    this.menu.desenhar(c, app);
  }
}
