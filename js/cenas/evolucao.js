// Evolução de cada pessoa: calorias por dia, totais, recordes e as últimas sessões.
import { LARGURA, CORES, FADIGA } from '../config.js';
import { texto, painel, kcalTexto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';

const PLANOS = { treino: 'TREINO DO DIA', danca: 'DANÇA', desafio: 'DESAFIO', teste30: 'TESTE 30 S' };
const dois = (n) => String(n).padStart(2, '0');

export class Evolucao {
  constructor(app) {
    this.app = app;
    this.id = (app.jogadores[0] || app.historico.perfis[0]).id;
    const abas = grade(app.historico.perfis.map((p) => ({ id: p.id, rotulo: p.nome, cor: p.cor, tam: 26 })), { colunas: 3, x: 250, y: 20, l: LARGURA - 290, a: 78, folga: 20 });
    this.menu = new Menu([{ id: 'voltar', x: 30, y: 20, l: 200, a: 78, rotulo: 'VOLTAR', cor: CORES.roxo, tam: 24 }, ...abas], { tempo: 1, voltar: 'voltar' });
    this.marcar();
  }

  marcar() {
    for (const b of this.menu.botoes) b.marcado = b.id === this.id;
  }

  atualizar() {
    const b = this.menu.atualizar(this.app);
    if (!b) return;
    if (b.id === 'voltar') return this.app.trocar(this.app.jogadores.length ? 'menu' : 'titulo');
    this.id = b.id;
    this.marcar();
  }

  desenhar(c) {
    const app = this.app;
    const h = app.historico;
    const perfil = h.perfil(this.id);
    const cor = perfil.cor;
    app.fundo(0.6);
    this.menu.desenhar(c, app);

    // calorias dos últimos 14 dias
    const dias = h.porDia(this.id, 14);
    const gx = 40;
    const gy = 125;
    const gl = 700;
    const ga = 300;
    painel(c, gx, gy, gl, ga, { cor });
    texto(c, 'KCAL POR DIA (14 DIAS)', gx + 20, gy + 26, { tam: 16, cor, alinhar: 'left', brilho: 0 });
    const max = Math.max(50, ...dias.map((d) => d.kcal));
    const base = gy + ga - 44;
    const alturaMax = ga - 100;
    const passo = (gl - 50) / dias.length;
    dias.forEach((d, i) => {
      const x = gx + 25 + i * passo;
      const a = (d.kcal / max) * alturaMax;
      const hoje = i === dias.length - 1;
      c.save();
      c.fillStyle = hoje ? CORES.amarelo : cor;
      c.shadowColor = c.fillStyle;
      c.shadowBlur = d.kcal > 0 ? 10 : 0;
      c.globalAlpha = d.kcal > 0 ? 1 : 0.25;
      c.fillRect(x + 5, base - Math.max(2, a), passo - 10, Math.max(2, a));
      c.restore();
      if (d.kcal > 0) texto(c, String(Math.round(d.kcal)), x + passo / 2, base - a - 12, { tam: 13, cor: CORES.branco, brilho: 0 });
      texto(c, d.data.slice(8), x + passo / 2, base + 18, { tam: 13, cor: hoje ? CORES.amarelo : '#b9a8dd', brilho: 0, peso: 500 });
    });

    // totais e recordes
    const t = h.totais(this.id);
    const px = 760;
    painel(c, px, gy, 480, ga, { cor });
    const teste = h.resultados(this.id, 'teste30');
    const linhas = [
      ['SESSÕES', String(t.sessoes)],
      ['DIAS COM TREINO', String(t.dias)],
      ['KCAL NO TOTAL', kcalTexto(t.kcal)],
      ['MINUTOS ATIVOS', String(Math.round(t.minutos))],
      ['RECORDE DO DESAFIO (60 S)', String(h.recorde(this.id, 'desafio') || '—')],
      ['TESTE DE 30 S: PRIMEIRO → ÚLTIMO', teste.length ? `${teste[0].valor} → ${teste.at(-1).valor}` : '—'],
      ['PESO', perfil.pesoKg ? `${perfil.pesoKg} KG` : '—'],
    ];
    linhas.forEach(([nome, valor], i) => {
      const y = gy + 36 + i * 38;
      texto(c, nome, px + 22, y, { tam: 15, cor: CORES.branco, alinhar: 'left', brilho: 0, peso: 500, largura: 320 });
      texto(c, valor, px + 458, y, { tam: 20, cor: CORES.amarelo, alinhar: 'right', brilho: 6 });
    });

    // últimas sessões
    const sessoes = h.sessoesDe(this.id).slice(-5).reverse();
    painel(c, 40, 445, 1200, 255, { cor });
    const colunas = [[60, 'DIA E HORA', 'left'], [300, 'ATIVIDADE', 'left'], [640, 'KCAL', 'right'], [790, 'ATIVO', 'right'], [960, 'FADIGA', 'right'], [1210, 'ESFORÇO', 'right']];
    for (const [x, nome, alinhar] of colunas) texto(c, nome, x, 472, { tam: 14, cor, alinhar, brilho: 0 });
    if (!sessoes.length) texto(c, 'NENHUMA SESSÃO GRAVADA AINDA', LARGURA / 2, 570, { tam: 24, cor: CORES.branco });
    sessoes.forEach((s, i) => {
      const y = 512 + i * 38;
      const d = new Date(s.inicio);
      const quando = `${dois(d.getDate())}/${dois(d.getMonth() + 1)}/${d.getFullYear()}  ${dois(d.getHours())}:${dois(d.getMinutes())}`;
      const corF = s.fadiga >= FADIGA.parar ? CORES.vermelho : s.fadiga >= FADIGA.atencao ? CORES.amarelo : CORES.verde;
      const o = { tam: 18, cor: CORES.branco, brilho: 0, peso: 500 };
      texto(c, quando, 60, y, { ...o, alinhar: 'left' });
      texto(c, PLANOS[s.plano] || s.plano, 300, y, { ...o, alinhar: 'left' });
      texto(c, kcalTexto(s.kcal), 640, y, { ...o, alinhar: 'right', cor: CORES.amarelo });
      texto(c, `${Math.max(1, Math.round(s.ativo / 60))} MIN`, 790, y, { ...o, alinhar: 'right' });
      texto(c, `${Math.round((s.fadiga || 0) * 100)} %`, 960, y, { ...o, alinhar: 'right', cor: corF });
      texto(c, s.esforco ? `${s.esforco} DE 10` : '—', 1210, y, { ...o, alinhar: 'right' });
    });
  }
}
