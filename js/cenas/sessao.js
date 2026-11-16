// A sessão na tela: desenha js/treino/sessao.js, toca os sons e cuida da pausa, da ausência e do espaço.
import { LARGURA, ALTURA, CORES, FADIGA } from '../config.js';
import { Sessao } from '../treino/sessao.js';
import { EXERCICIOS } from '../treino/exercicios.js';
import { TEMPOS_POR_POSE } from '../treino/danca.js';
import { diaDe } from '../treino/plano.js';
import { ANIMACOES, poseDoAlvo, emPe } from '../motor/poses.js';
import { texto, paragrafo, painel, barra, anel, kcalTexto } from '../arte/neon.js';
import { desenharBoneco, centroDoBoneco } from '../arte/avatar.js';
import { Menu, desenharCursores } from '../ui.js';

const ROTULO = { rep: 'REPETIÇÕES', segurar: 'SEGUNDOS', danca: 'PONTOS', livre: '' };

export class CenaSessao {
  constructor(app, dados) {
    this.app = app;
    this.sessao = new Sessao(dados.plano, app.jogadores, { bpm: app.audio.bpmAtual, semente: diaDe() });
    this.pausada = false;
    this.ausente = 0;
    this.parada = null; // motivo da parada automática: 'ausente' | 'perto'
    this.menuJogo = new Menu([{ id: 'pausar', x: 20, y: 630, l: 170, a: 70, rotulo: 'PAUSAR', cor: CORES.roxo, tam: 22 }], { tempo: 2, voltar: 'pausar' });
    this.menuPausa = new Menu(
      [
        { id: 'continuar', x: LARGURA / 2 - 420, y: 330, l: 400, a: 130, rotulo: 'CONTINUAR', cor: CORES.verde, tam: 36 },
        { id: 'terminar', x: LARGURA / 2 + 20, y: 330, l: 400, a: 130, rotulo: 'TERMINAR', sub: 'GRAVA O QUE JÁ FOI FEITO', cor: CORES.vermelho, tam: 36 },
      ],
      { voltar: 'continuar' },
    );
    this.pulso = [0, 0]; // brilho do número quando conta uma repetição
    app.audio.tocar('treino');
    app.audio.falar(`Preparar. ${this.nomes(this.sessao.plano.blocos[0])}`);
  }

  get semCursor() {
    return !this.pausada;
  }

  // "AGACHAMENTO" ou "FOCO: AGACHAMENTO. ÂNIMO: AGACHAMENTO PARCIAL"
  nomes(bloco) {
    const ids = bloco.exercicios;
    if (ids.every((id) => id === ids[0])) return EXERCICIOS[ids[0]].nome;
    return ids.map((id, j) => `${this.app.jogadores[j].nome}: ${EXERCICIOS[id].nome}`).join('. ');
  }

  // o jogador automático faz o exercício de cada pessoa
  moverRobo() {
    const s = this.sessao;
    const e = this.app.entrada;
    if (!e.robo) return;
    s.jogadores.forEach((jog, j) => {
      if (s.fase !== 'bloco') e.roboCorpo[j] = null;
      else if (s.bloco.tipo === 'danca') {
        e.roboCorpo[j] = () => {
          const passo = jog.atual && s.passos[jog.atual.passo];
          return passo && s.batida >= passo.tempo - 0.7 ? poseDoAlvo(passo.pose) : emPe();
        };
      } else {
        const ex = s.exercicioDe(j);
        e.roboCorpo[j] = (t) => ANIMACOES[ex.anim]((t / ex.ciclo) % 1);
      }
    });
  }

  atualizar(dt) {
    const app = this.app;
    const e = app.entrada;
    const s = this.sessao;
    const audio = app.audio;

    if (this.pausada) {
      const b = this.menuPausa.atualizar(app);
      if (b && b.id === 'continuar') {
        this.pausada = false;
        audio.pausar(false);
      } else if (b && b.id === 'terminar') {
        audio.pausar(false);
        s.terminar();
        this.sair();
      }
      return;
    }
    if (this.menuJogo.atualizar(app)) {
      this.pausada = true;
      audio.pausar(true);
      return;
    }

    // parada automática: ninguém na frente da câmera, ou duas pessoas perto demais
    const alguem = s.jogadores.some((_, j) => e.j[j].presente);
    this.ausente = alguem ? 0 : this.ausente + dt;
    const perto = e.n === 2 && e.espaco && e.espaco.nivel === 'perto' && s.jogadores.every((_, j) => e.j[j].presente);
    const parada = this.ausente > 2 ? 'ausente' : perto ? 'perto' : null;
    if (parada !== this.parada) {
      this.parada = parada;
      audio.pausar(!!parada);
      if (parada === 'perto') audio.falar('Afastem-se um do outro.');
    }
    if (parada) return;

    for (let j = 0; j < s.jogadores.length; j++) {
      const ex = s.fase === 'bloco' ? s.exercicioDe(j) : null;
      e.j[j].leitor.baseFirme = !!(ex && ex.baseFirme);
      this.pulso[j] = Math.max(0, this.pulso[j] - dt * 4);
    }
    const sinais = s.atualizar(dt, e.j);
    this.moverRobo();
    for (const sinal of sinais) {
      if (sinal.tipo === 'bloco') {
        audio.efeito('vai');
        audio.tocar(sinal.bloco.tipo === 'danca' ? 'danca' : 'treino');
        audio.falar(sinal.bloco.tipo === 'danca' ? 'Dança. Imite as poses.' : this.nomes(sinal.bloco));
      } else if (sinal.tipo === 'descanso') {
        audio.tocar('treino');
        audio.falar(`Descanso. A seguir: ${this.nomes(sinal.proximo)}`);
      } else if (sinal.tipo === 'contagem') audio.efeito('contagem');
      else if (sinal.tipo === 'rep') {
        audio.efeito('rep');
        this.pulso[sinal.j] = 1;
      } else if (sinal.tipo === 'aviso') {
        audio.efeito('aviso');
        audio.falar(`${s.jogadores[sinal.j].perfil.nome}, ${sinal.texto}`);
      } else if (sinal.tipo === 'fadiga') {
        const nome = s.jogadores[sinal.j].perfil.nome;
        audio.falar(sinal.nivel === 'parar' ? `${nome}, sinal de fadiga. Pare e respire.` : `${nome}, você está perdendo o ritmo. Diminua um pouco.`);
      } else if (sinal.tipo === 'nota') {
        audio.efeito(sinal.texto === 'ÓTIMO' ? 'otimo' : 'bom');
        this.pulso[sinal.j] = 1;
      } else if (sinal.tipo === 'fim') {
        audio.efeito('fim');
        this.sair();
      }
    }
  }

  sair() {
    const e = this.app.entrada;
    e.roboCorpo = [null, null];
    for (const j of e.j) j.leitor.baseFirme = false;
    this.app.trocar('esforco', { sessao: this.sessao });
  }

  // ---- desenho

  desenhar(c) {
    const app = this.app;
    const s = this.sessao;
    app.fundo(0.62);
    app.desenharVideo(0.3);
    app.desenharPessoas();

    // progresso do plano
    c.fillStyle = 'rgba(255,255,255,0.15)';
    c.fillRect(0, 0, LARGURA, 6);
    c.fillStyle = CORES.verde;
    c.fillRect(0, 0, LARGURA * s.progresso, 6);

    const bloco = s.bloco;
    const emBloco = s.fase === 'bloco';
    const fase = emBloco ? bloco.fase || '' : s.fase === 'descanso' ? 'DESCANSO' : 'PREPARAR';
    texto(c, s.plano.nome, 24, 34, { tam: 20, cor: CORES.rosa, alinhar: 'left' });
    texto(c, fase, 24, 62, { tam: 16, cor: CORES.branco, alinhar: 'left', brilho: 0, peso: 500 });
    texto(c, `BLOCO ${Math.max(1, s.indice + 1)} DE ${s.plano.blocos.length}`, LARGURA - 24, 34, { tam: 16, cor: CORES.branco, alinhar: 'right', brilho: 0, peso: 500 });

    // relógio
    const total = emBloco ? bloco.segundos : s.fase === 'descanso' ? s.plano.descanso : 6;
    const corFase = emBloco ? CORES.rosa : CORES.ciano;
    c.fillStyle = 'rgba(14,4,40,0.8)';
    c.beginPath();
    c.arc(LARGURA / 2, 78, 58, 0, 7);
    c.fill();
    anel(c, LARGURA / 2, 78, 52, s.restante / total, corFase, 9);
    const urgente = s.restante <= 3;
    texto(c, String(Math.ceil(Math.max(0, s.restante))), LARGURA / 2, 81, { tam: urgente ? 56 : 46, cor: urgente ? CORES.amarelo : CORES.branco, fonte: 'Audiowide', peso: 400 });

    if (emBloco) {
      s.jogadores.forEach((jog, j) => this.painelDaPessoa(c, jog, j));
      if (bloco.tipo === 'danca') this.linhaDaDanca(c);
      this.dicas(c);
    } else {
      this.aSeguir(c);
    }

    const e = app.entrada;
    if (e.n === 2 && e.espaco && e.espaco.nivel === 'atencao' && !this.parada) {
      texto(c, 'CUIDADO: VOCÊS ESTÃO PERTO UM DO OUTRO', LARGURA / 2, 150, { tam: 20, cor: CORES.amarelo });
    }

    this.menuJogo.desenhar(c, app);
    if (this.parada) {
      this.aviso(c, this.parada === 'perto' ? 'AFASTEM-SE UM DO OUTRO' : 'VOLTE PARA A FRENTE DA CÂMERA', 'O TEMPO ESTÁ PARADO');
    } else if (this.pausada) {
      c.fillStyle = 'rgba(10,2,28,0.75)';
      c.fillRect(0, 0, LARGURA, ALTURA);
      texto(c, 'PAUSA', LARGURA / 2, 230, { tam: 72, cor: CORES.amarelo, fonte: 'Audiowide', peso: 400 });
      this.menuPausa.desenhar(c, app);
    } else {
      // o cursor só aparece perto do botão de pausa
      const alguem = e.j.some((jog, i) => i < e.n && jog.cursor.ativo && jog.cursor.alvo);
      if (alguem) desenharCursores(c, app);
    }
  }

  aviso(c, titulo, sub) {
    painel(c, LARGURA / 2 - 380, 280, 760, 150, { cor: CORES.vermelho, fundo: 'rgba(60,0,20,0.9)' });
    texto(c, titulo, LARGURA / 2, 335, { tam: 38, cor: CORES.vermelho, largura: 720 });
    texto(c, sub, LARGURA / 2, 392, { tam: 19, cor: CORES.branco, brilho: 0, peso: 500 });
  }

  painelDaPessoa(c, jog, j) {
    const app = this.app;
    const s = this.sessao;
    const a = jog.atual;
    if (!a) return;
    const ex = EXERCICIOS[a.exercicio];
    const cor = jog.perfil.cor;
    const l = 290;
    const x = j === 0 ? 20 : LARGURA - l - 20;
    const y = 130;
    painel(c, x, y, l, 480, { cor });
    const cx = x + l / 2;
    texto(c, jog.perfil.nome, cx, y + 30, { tam: 26, cor, fonte: 'Audiowide', peso: 400 });
    texto(c, ex.nome, cx, y + 62, { tam: 19, cor: CORES.branco, largura: l - 24, brilho: 0 });

    // boneco que mostra o movimento
    const corpo = s.bloco.tipo === 'danca' ? this.poseAtual(jog) : ANIMACOES[ex.anim]((app.t / ex.ciclo) % 1);
    const deitado = ex.chao;
    const escala = deitado ? 62 : 54;
    desenharBoneco(c, corpo, cx - centroDoBoneco(corpo) * escala, y + (deitado ? 215 : 268), escala, CORES.amarelo, 4.5);

    // número grande
    const valor = ex.tipo === 'segurar' ? Math.floor(a.seguro) : ex.tipo === 'danca' ? a.pontos : a.reps;
    if (ex.tipo !== 'livre') {
      const p = this.pulso[j];
      texto(c, String(valor), cx, y + 322, { tam: 76 + p * 14, cor: p > 0.1 ? CORES.amarelo : CORES.branco, fonte: 'Audiowide', peso: 400, brilho: 14 + p * 20, corBrilho: cor });
      texto(c, ROTULO[ex.tipo], cx, y + 370, { tam: 14, cor, brilho: 0 });
    } else {
      texto(c, 'RESPIRE', cx, y + 330, { tam: 34, cor: CORES.ciano });
    }
    // o quanto falta para a repetição valer
    if (ex.tipo === 'rep' || ex.tipo === 'segurar') barra(c, x + 24, y + 390, l - 48, 12, a.nivel, a.nivel >= 1 ? CORES.verde : cor);
    texto(c, `${kcalTexto(jog.kcal)} KCAL`, cx, y + 425, { tam: 22, cor: CORES.amarelo, brilho: 6 });
    // fadiga
    const indice = a.fadiga.indice;
    const nivel = a.fadiga.nivel;
    const corFadiga = nivel === 'parar' ? CORES.vermelho : nivel === 'atencao' ? CORES.amarelo : CORES.verde;
    texto(c, nivel === 'parar' ? 'FADIGA: PARE E RESPIRE' : nivel === 'atencao' ? 'FADIGA: DIMINUA O RITMO' : 'FADIGA', cx, y + 452, { tam: 12, cor: corFadiga, brilho: 0 });
    barra(c, x + 24, y + 462, l - 48, 8, indice / (FADIGA.parar * 1.3), corFadiga);

    // avisos e notas aparecem sobre a pessoa
    const L = app.entrada.j[j].leitor;
    const area = app.area;
    const px = L.q && L.quadril ? area.x + (L.quadril.x / app.entrada.aspecto) * area.l : s.jogadores.length === 1 ? LARGURA / 2 : j === 0 ? 470 : 810;
    const pxLimitado = Math.max(470, Math.min(810, px));
    // na dança, a linha das poses ocupa o alto da tela
    const py = s.bloco.tipo === 'danca' ? 392 : 250;
    if (jog.aviso) {
      const pisca = Math.sin(app.t * 14) > -0.4;
      painel(c, pxLimitado - 170, py - 40, 340, 76, { cor: CORES.vermelho, fundo: pisca ? 'rgba(120,0,40,0.92)' : 'rgba(60,0,20,0.92)', brilho: 26 });
      texto(c, jog.aviso, pxLimitado, py - 1, { tam: 34, cor: '#fff', corBrilho: CORES.vermelho, largura: 310 });
    } else if (jog.nota) {
      texto(c, jog.nota, pxLimitado, py, { tam: 46, cor: jog.nota === 'ÓTIMO' ? CORES.amarelo : jog.nota === 'BOM' ? CORES.verde : CORES.branco, fonte: 'Audiowide', peso: 400, brilho: 22 });
    } else if (ex.quase && ex.tipo === 'rep' && a.nivel > 0.55 && a.nivel < 1) {
      texto(c, ex.quase, pxLimitado, py, { tam: 24, cor: CORES.ciano });
    }
  }

  poseAtual(jog) {
    const passo = jog.atual && this.sessao.passos[jog.atual.passo];
    return passo ? poseDoAlvo(passo.pose) : emPe();
  }

  // as próximas poses chegam pela direita, no tempo da música
  linhaDaDanca(c) {
    const s = this.sessao;
    const batida = s.batida;
    const cx = LARGURA / 2;
    const y = 320;
    painel(c, cx - 300, 150, 600, 190, { cor: CORES.ciano, fundo: 'rgba(14,4,40,0.55)', brilho: 8 });
    // a moldura da pose da vez pulsa na batida
    const bate = 1 - (batida % 1);
    painel(c, cx - 290, 158, 150, 174, { cor: CORES.amarelo, fundo: 'rgba(255,225,74,0.08)', brilho: 8 + bate * 22, espessura: 3 + bate * 2 });
    c.save();
    c.beginPath();
    c.rect(cx - 298, 152, 596, 186);
    c.clip();
    for (const passo of s.passos) {
      const rel = (passo.tempo - batida) / TEMPOS_POR_POSE;
      if (rel < -0.75 || rel > 3.4) continue;
      const x = cx - 215 + Math.max(0, rel) * 150;
      const daVez = rel <= 0.25;
      c.globalAlpha = daVez ? 1 : Math.max(0.25, 1 - rel * 0.25);
      desenharBoneco(c, poseDoAlvo(passo.pose), x, y, daVez ? 42 : 36, daVez ? CORES.amarelo : CORES.ciano, daVez ? 4.5 : 3.5);
      if (daVez) texto(c, passo.pose.nome, x, 172, { tam: 15, cor: CORES.amarelo, brilho: 0 });
    }
    c.restore();
    if (batida < 8) texto(c, 'PREPARE-SE: IMITE A POSE AMARELA', cx + 75, 245, { tam: 20, cor: CORES.branco, largura: 420 });
  }

  dicas(c) {
    const s = this.sessao;
    const ids = s.bloco.exercicios;
    const y = 668;
    painel(c, 210, 630, LARGURA - 420, 76, { cor: CORES.roxo, brilho: 6 });
    if (ids.every((id) => id === ids[0])) {
      paragrafo(c, EXERCICIOS[ids[0]].dica, LARGURA / 2, ids.length && EXERCICIOS[ids[0]].dica.length > 58 ? y - 12 : y, LARGURA - 460, { tam: 18, cor: CORES.branco, brilho: 0, peso: 500 });
    } else {
      ids.forEach((id, j) => {
        texto(c, `${s.jogadores[j].perfil.nome}: ${EXERCICIOS[id].dica}`, LARGURA / 2, y - 14 + j * 28, { tam: 16, cor: s.jogadores[j].perfil.cor, brilho: 0, peso: 500, largura: LARGURA - 460 });
      });
    }
  }

  // descanso e preparação: mostra o próximo exercício de cada pessoa
  aSeguir(c) {
    const app = this.app;
    const s = this.sessao;
    const proximo = s.proximo;
    if (!proximo) return;
    const n = s.jogadores.length;
    const iguais = proximo.exercicios.every((id) => id === proximo.exercicios[0]);
    const colunas = iguais ? 1 : n;
    const l = iguais ? 560 : 420;
    const total = colunas * l + (colunas - 1) * 30;
    texto(c, s.fase === 'descanso' ? 'DESCANSO' : 'PREPARAR', LARGURA / 2, 185, { tam: 54, cor: CORES.ciano, fonte: 'Audiowide', peso: 400 });
    for (let k = 0; k < colunas; k++) {
      const ex = EXERCICIOS[proximo.exercicios[k]];
      const x = LARGURA / 2 - total / 2 + k * (l + 30);
      const cor = iguais ? CORES.rosa : s.jogadores[k].perfil.cor;
      painel(c, x, 230, l, 380, { cor });
      texto(c, iguais ? 'A SEGUIR' : `A SEGUIR: ${s.jogadores[k].perfil.nome}`, x + l / 2, 262, { tam: 18, cor, brilho: 0 });
      texto(c, ex.nome, x + l / 2, 300, { tam: 28, cor: CORES.branco, largura: l - 30 });
      const corpo = ANIMACOES[ex.anim]((app.t / ex.ciclo) % 1);
      const escala = 56;
      desenharBoneco(c, corpo, x + l / 2 - centroDoBoneco(corpo) * escala, ex.chao ? 470 : 520, escala, CORES.amarelo, 5);
      paragrafo(c, ex.dica, x + l / 2, 550, l - 40, { tam: 16, cor: CORES.branco, brilho: 0, peso: 500 });
    }
    if (s.fase === 'descanso') {
      const kcal = s.jogadores.map((jog) => `${jog.perfil.nome}: ${kcalTexto(jog.kcal)} KCAL`).join('     ');
      texto(c, kcal, LARGURA / 2, 668, { tam: 22, cor: CORES.amarelo });
    }
  }
}
