// Resultado da sessão de cada pessoa.
import { LARGURA, CORES, FADIGA } from '../config.js';
import { EXERCICIOS } from '../treino/exercicios.js';
import { texto, painel, kcalTexto, tempoTexto } from '../arte/neon.js';
import { Menu } from '../ui.js';

export class Resultado {
  /** dados: { sessao, registros, anteriores } */
  constructor(app, dados) {
    this.app = app;
    this.sessao = dados.sessao;
    this.registros = dados.registros;
    this.colunas = dados.registros.map((r, i) => this.montar(r, dados.anteriores[i]));
    this.menu = new Menu([{ id: 'ok', x: LARGURA / 2 - 190, y: 622, l: 380, a: 84, rotulo: 'CONTINUAR', cor: CORES.verde, tam: 30 }], { voltar: 'ok' });
    if (this.colunas.some((k) => k.recorde)) app.audio.efeito('fim');
  }

  montar(r, anterior) {
    const plano = this.sessao.plano;
    // soma os blocos do mesmo exercício
    const soma = new Map();
    for (const b of r.blocos) {
      if (b.tipo === 'livre') continue;
      const s = soma.get(b.exercicio) || { reps: 0, segundos: 0, tipo: b.tipo, pontos: 0 };
      s.reps += b.reps;
      s.segundos += b.segundos;
      s.pontos += b.pontos || 0;
      soma.set(b.exercicio, s);
    }
    const linhas = [...soma].map(([id, s]) => ({
      nome: EXERCICIOS[id].nome,
      valor: s.tipo === 'segurar' ? `${s.reps} S` : s.tipo === 'danca' ? `${s.pontos} PTS` : String(s.reps),
    }));
    // perda de desempenho: o ritmo de hoje contra a média das sessões anteriores
    let queda = 0;
    let exercicioQueda = '';
    for (const [id, s] of soma) {
      const antes = anterior.ritmos[id];
      if (s.tipo !== 'rep' || !antes || s.segundos < 20) continue;
      const q = 1 - (s.reps / s.segundos) * 60 / antes;
      if (q > queda) {
        queda = q;
        exercicioQueda = EXERCICIOS[id].nome;
      }
    }
    const principal = r.blocos[0] ? r.blocos[0].reps : 0;
    return {
      perfil: this.app.historico.perfil(r.perfil),
      r,
      linhas,
      queda,
      exercicioQueda,
      recorde: !!plano.recorde && principal > anterior.recorde && principal > 0,
      principal,
    };
  }

  atualizar() {
    if (this.menu.atualizar(this.app)) this.app.trocar('menu');
  }

  desenhar(c) {
    const app = this.app;
    app.fundo(0.55);
    texto(c, this.sessao.plano.nome, LARGURA / 2, 50, { tam: 42, cor: CORES.rosa, fonte: 'Audiowide', peso: 400 });
    if (!this.colunas.length) {
      texto(c, 'SESSÃO CURTA DEMAIS', LARGURA / 2, 300, { tam: 40, cor: CORES.amarelo });
      texto(c, 'NADA FOI GRAVADO. UMA SESSÃO PRECISA DE 20 SEGUNDOS DE MOVIMENTO.', LARGURA / 2, 360, { tam: 20, cor: CORES.branco, brilho: 0, peso: 500 });
    }
    const n = this.colunas.length;
    const l = n === 1 ? 640 : 560;
    this.colunas.forEach((k, i) => {
      const x = n === 1 ? LARGURA / 2 - l / 2 : i === 0 ? LARGURA / 2 - l - 20 : LARGURA / 2 + 20;
      const cx = x + l / 2;
      const cor = k.perfil.cor;
      painel(c, x, 90, l, 515, { cor });
      texto(c, k.perfil.nome, cx, 124, { tam: 30, cor, fonte: 'Audiowide', peso: 400 });
      texto(c, kcalTexto(k.r.kcal), cx - 20, 190, { tam: 72, cor: CORES.amarelo, fonte: 'Audiowide', peso: 400, alinhar: 'right', brilho: 18 });
      texto(c, 'KCAL', cx - 6, 204, { tam: 24, cor: CORES.amarelo, alinhar: 'left' });
      texto(c, `ATIVO ${tempoTexto(k.r.ativo)}`, cx - 6, 172, { tam: 18, cor: CORES.branco, alinhar: 'left', brilho: 0, peso: 500 });
      if (k.recorde) texto(c, `NOVO RECORDE: ${k.principal}`, cx, 250, { tam: 26, cor: CORES.verde });
      let y = k.recorde ? 290 : 256;
      const passo = Math.min(30, (480 - y) / Math.max(1, k.linhas.length));
      for (const linha of k.linhas) {
        texto(c, linha.nome, x + 34, y, { tam: 17, cor: CORES.branco, alinhar: 'left', brilho: 0, peso: 500, largura: l - 180 });
        texto(c, linha.valor, x + l - 34, y, { tam: 19, cor, alinhar: 'right', brilho: 0 });
        y += passo;
      }
      // fadiga e desempenho
      const f = k.r.fadiga;
      const [msg, corF] = f >= FADIGA.parar ? ['FADIGA ALTA: DESCANSE ANTES DO PRÓXIMO TREINO', CORES.vermelho] : f >= FADIGA.atencao ? ['FADIGA LEVE NO FIM DOS BLOCOS', CORES.amarelo] : ['SEM SINAL DE FADIGA', CORES.verde];
      texto(c, msg, cx, 520, { tam: 17, cor: corF, largura: l - 40 });
      const linha2 = k.queda >= 0.15 ? `RITMO ${Math.round(k.queda * 100)} % ABAIXO DA SUA MÉDIA: ${k.exercicioQueda}` : k.r.esforco ? `ESFORÇO PERCEBIDO: ${k.r.esforco} DE 10` : '';
      texto(c, linha2, cx, 552, { tam: 15, cor: k.queda >= 0.15 ? CORES.laranja : CORES.branco, brilho: 0, peso: 500, largura: l - 40 });
      texto(c, 'CALORIAS: ESTIMATIVA PELO PESO E PELO TIPO DE EXERCÍCIO', cx, 584, { tam: 11, cor: '#b9a8dd', brilho: 0, peso: 500 });
    });
    this.menu.desenhar(c, app);
  }
}
