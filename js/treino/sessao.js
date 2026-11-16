// Uma sessão em andamento: passa pelos blocos do plano e faz as contas de cada pessoa
// (repetições, calorias, fadiga, avisos de segurança, pontos da dança).
// Lógica pura (sem DOM): a cena js/cenas/sessao.js desenha, e os testes rodam no Node.
import { EXERCICIOS, MET_REPOUSO, calorias } from './exercicios.js';
import { PESO_PADRAO } from './perfis.js';
import { avisoDeSeguranca } from './seguranca.js';
import { coreografia, notaDaPose, TEMPOS_POR_POSE } from './danca.js';
import { Fadiga } from '../motor/fadiga.js';
import { compararPose } from '../motor/corpo.js';

const PREPARAR = 6; // segundos antes do primeiro bloco
const MOVIMENTO = 4; // segundos sem repetição: a pessoa parou

export class Sessao {
  /**
   * @param {object} plano de js/treino/plano.js
   * @param {Array} perfis 1 ou 2 perfis
   * @param {object} o { inicio: Date, bpm, semente }
   */
  constructor(plano, perfis, o = {}) {
    this.plano = plano;
    this.bpm = o.bpm || 124;
    this.semente = o.semente || 0;
    this.inicio = o.inicio || new Date();
    this.fim = null;
    this.t = 0; // segundos de sessão (sem as pausas)
    this.indice = -1;
    this.fase = 'preparar'; // preparar | bloco | descanso | fim
    this.restante = PREPARAR;
    this.sinais = [];
    this.passos = [];
    this.jogadores = perfis.map((perfil) => ({
      perfil,
      kcal: 0,
      ativo: 0,
      pontos: 0,
      fadiga: 0,
      blocos: [],
      atual: null,
      aviso: null,
      avisoAte: 0,
      nota: null,
      notaAte: 0,
    }));
  }

  get bloco() {
    return this.plano.blocos[this.indice] || null;
  }

  get proximo() {
    return this.plano.blocos[this.indice + 1] || null;
  }

  exercicioDe(j, bloco = this.bloco) {
    return bloco ? EXERCICIOS[bloco.exercicios[j]] : null;
  }

  // fração do plano já feita (0..1)
  get progresso() {
    const n = this.plano.blocos.length;
    if (this.fase === 'fim') return 1;
    if (this.indice < 0) return 0;
    const b = this.bloco;
    const dentro = this.fase === 'bloco' ? 1 - this.restante / b.segundos : 1;
    return (this.indice + dentro) / n;
  }

  // tempo da música dentro do bloco de dança (em batidas)
  get batida() {
    return this.fase === 'bloco' && this.bloco.tipo === 'danca' ? ((this.bloco.segundos - this.restante) * this.bpm) / 60 : 0;
  }

  comecarBloco() {
    this.indice++;
    const b = this.bloco;
    this.fase = 'bloco';
    this.restante = b.segundos;
    this.passos = b.tipo === 'danca' ? coreografia(Math.floor((b.segundos * this.bpm) / 60), this.semente + this.indice) : [];
    this.jogadores.forEach((jog, j) => {
      jog.atual = {
        exercicio: b.exercicios[j],
        reps: 0,
        seguro: 0, // segundos na posição (tipo 'segurar')
        qualidades: [],
        fadiga: new Fadiga(),
        ultimoMovimento: -Infinity,
        nivel: 0,
        pontos: 0,
        passo: 0, // próximo passo da dança a pontuar
        melhor: 0,
        avisouFadiga: 'ok',
      };
    });
    this.sinais.push({ tipo: 'bloco', bloco: b });
  }

  terminarBloco() {
    const b = this.bloco;
    this.jogadores.forEach((jog) => {
      const a = jog.atual;
      const ex = EXERCICIOS[a.exercicio];
      const q = a.qualidades;
      const indice = a.fadiga.indice;
      jog.fadiga = Math.max(jog.fadiga, indice);
      jog.blocos.push({
        exercicio: a.exercicio,
        tipo: ex.tipo,
        segundos: b.segundos,
        reps: ex.tipo === 'segurar' ? Math.round(a.seguro) : a.reps,
        qualidade: q.length ? +(q.reduce((s, x) => s + x, 0) / q.length).toFixed(2) : null,
        perdaVelocidade: +a.fadiga.perdaVelocidade.toFixed(2),
        fadiga: +indice.toFixed(2),
        pontos: a.pontos,
      });
      jog.atual = null;
    });
    if (this.proximo) {
      this.fase = 'descanso';
      this.restante = this.plano.descanso;
      this.sinais.push({ tipo: 'descanso', proximo: this.proximo });
    } else {
      this.terminar();
    }
  }

  // Termina agora (fim do plano ou saída no meio). O bloco em andamento entra pela parte feita.
  terminar() {
    if (this.fase === 'fim') return;
    if (this.fase === 'bloco') {
      const b = this.bloco;
      const feito = b.segundos - this.restante;
      this.jogadores.forEach((jog) => {
        const a = jog.atual;
        if (!a || feito < 5) return;
        const ex = EXERCICIOS[a.exercicio];
        jog.fadiga = Math.max(jog.fadiga, a.fadiga.indice);
        jog.blocos.push({
          exercicio: a.exercicio, tipo: ex.tipo, segundos: Math.round(feito),
          reps: ex.tipo === 'segurar' ? Math.round(a.seguro) : a.reps,
          qualidade: null, perdaVelocidade: +a.fadiga.perdaVelocidade.toFixed(2), fadiga: +a.fadiga.indice.toFixed(2), pontos: a.pontos,
        });
        jog.atual = null;
      });
    }
    this.fase = 'fim';
    this.fim = new Date(this.inicio.getTime() + this.t * 1000);
    this.sinais.push({ tipo: 'fim' });
  }

  /**
   * @param {number} dt segundos desde o último quadro
   * @param {Array} entradas por pessoa: { presente, eventos: [{ nome, ...rep }], segurando, medidas, niveis }
   * @returns {Array} sinais deste quadro (para o som, a voz e os efeitos)
   */
  atualizar(dt, entradas) {
    this.sinais = [];
    if (this.fase === 'fim') return this.sinais;
    this.t += dt;
    const antes = this.restante;
    this.restante -= dt;
    // contagem regressiva dos 3 últimos segundos
    if (Math.ceil(antes) !== Math.ceil(this.restante) && this.restante > 0 && this.restante <= 3) {
      this.sinais.push({ tipo: 'contagem', n: Math.ceil(this.restante) });
    }

    const b = this.fase === 'bloco' ? this.bloco : null;
    this.jogadores.forEach((jog, j) => {
      const e = entradas[j] || {};
      const peso = jog.perfil.pesoKg || PESO_PADRAO;
      if (!b) {
        if (e.presente) jog.kcal += calorias(MET_REPOUSO, peso, dt);
        return;
      }
      const a = jog.atual;
      const ex = EXERCICIOS[a.exercicio];
      const reps = {};
      for (const ev of e.eventos || []) reps[ev.nome] = ev;
      a.nivel = (e.niveis && e.niveis[ex.contador]) || 0;

      if (ex.tipo === 'rep') {
        const r = reps[ex.contador];
        if (r) {
          a.reps++;
          a.qualidades.push(r.qualidade ?? 1);
          a.fadiga.registrar(this.t, r);
          a.ultimoMovimento = this.t;
          this.sinais.push({ tipo: 'rep', j, n: a.reps });
        }
      } else if (ex.tipo === 'segurar') {
        if (e.segurando && e.segurando[ex.contador]) {
          a.seguro += dt;
          a.ultimoMovimento = this.t;
          a.nivel = 1;
        }
      } else if (ex.tipo === 'danca') {
        this.pontuarDanca(jog, j, e);
      } else if (e.presente) {
        a.ultimoMovimento = this.t;
      }

      // calorias: o MET do exercício enquanto a pessoa se move; parado, o de repouso
      const movendo = e.presente && this.t - a.ultimoMovimento < MOVIMENTO;
      if (e.presente) jog.kcal += calorias(movendo ? ex.met : MET_REPOUSO, peso, dt);
      if (movendo) jog.ativo += dt;

      const aviso = avisoDeSeguranca(jog.perfil, ex, e.medidas, reps);
      if (aviso) {
        if (jog.aviso !== aviso || this.t > jog.avisoAte) this.sinais.push({ tipo: 'aviso', j, texto: aviso });
        jog.aviso = aviso;
        jog.avisoAte = this.t + 2;
      } else if (this.t > jog.avisoAte) {
        jog.aviso = null;
      }
      const nivel = a.fadiga.nivel;
      if (nivel !== a.avisouFadiga) {
        if (nivel !== 'ok') this.sinais.push({ tipo: 'fadiga', j, nivel });
        a.avisouFadiga = nivel;
      }
      if (this.t > jog.notaAte) jog.nota = null;
    });

    if (this.restante <= 0) {
      if (this.fase === 'bloco') this.terminarBloco();
      else this.comecarBloco();
    }
    return this.sinais;
  }

  pontuarDanca(jog, j, e) {
    const a = jog.atual;
    const passo = this.passos[a.passo];
    if (!passo) return;
    const batida = this.batida;
    // a pose vale de meio tempo antes até o fim dos seus tempos
    if (batida >= passo.tempo - 0.5 && e.medidas && e.medidas.pose) {
      a.melhor = Math.max(a.melhor, compararPose(e.medidas.pose, passo.pose));
    }
    if (batida >= passo.tempo + TEMPOS_POR_POSE - 0.5) {
      const nota = notaDaPose(a.melhor);
      if (nota.pontos > 0) {
        a.pontos += nota.pontos;
        jog.pontos += nota.pontos;
        a.reps++;
        a.qualidades.push(a.melhor);
        a.ultimoMovimento = this.t;
        jog.nota = nota.texto;
        jog.notaAte = this.t + 0.9;
        this.sinais.push({ tipo: 'nota', j, texto: nota.texto });
      }
      a.passo++;
      a.melhor = 0;
    }
  }

  // Registros para o histórico, um por pessoa. Quem ficou ativo menos de 20 s não entra.
  registros(esforcos = []) {
    const fim = this.fim || new Date(this.inicio.getTime() + this.t * 1000);
    return this.jogadores
      .map((jog, j) => ({
        perfil: jog.perfil.id,
        plano: this.plano.id,
        inicio: this.inicio.toISOString(),
        fim: fim.toISOString(),
        ativo: Math.round(jog.ativo),
        kcal: +jog.kcal.toFixed(1),
        pesoKg: jog.perfil.pesoKg || PESO_PADRAO,
        blocos: jog.blocos,
        fadiga: +jog.fadiga.toFixed(2),
        esforco: esforcos[j] ?? null,
        pontos: jog.pontos,
      }))
      .filter((r) => r.ativo >= 20);
  }
}
