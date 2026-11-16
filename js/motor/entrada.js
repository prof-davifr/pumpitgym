// Junta a câmera (ou o jogador automático de ?robo=1), o teclado e o ponteiro.
// Para cada pessoa: repetições do quadro, posições seguradas, medidas e o cursor da mão.
import { LIMIARES, SENSIBILIDADES, opcoes } from '../config.js';
import { CameraPose } from './camera-pose.js';
import { LeitorCorpo } from './corpo.js';
import { CursorMao } from './cursor-mao.js';
import { Rastreador } from './rastreio.js';
import { medirEspaco } from './espaco.js';
import { ANIMACOES, paraCamera } from './poses.js';

const parametros = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

function novoJogador() {
  return {
    leitor: new LeitorCorpo(LIMIARES, SENSIBILIDADES[opcoes.sensibilidade] || 1),
    cursor: new CursorMao(),
    presente: false,
    calibrado: false,
    eventos: [],
    segurando: {},
    medidas: null,
    niveis: {},
  };
}

export class Entrada {
  constructor(tela) {
    this.camera = new CameraPose();
    this.robo = parametros.has('robo');
    this.n = 1;
    this.rastreador = new Rastreador(1);
    this.j = [novoJogador(), novoJogador()];
    this.espaco = null;
    // jogador automático: uma função (t) => corpo por pessoa; null = parado
    this.roboCorpo = [null, null];
    this.ultimoRobo = 0;

    this.teclas = new Set(); // teclas apertadas neste quadro
    this._teclas = new Set();
    this.ponteiro = { x: 0, y: 0, dentro: false, clicou: false };
    this._clicou = false;
    this.usouGesto = false; // o navegador só libera o som depois de um clique ou tecla

    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this._teclas.add(e.code);
      this.usouGesto = true;
    });
    const mover = (e) => {
      const r = tela.getBoundingClientRect();
      this.ponteiro.px = e.clientX - r.left;
      this.ponteiro.py = e.clientY - r.top;
      this.ponteiro.dentro = true;
    };
    tela.addEventListener('pointermove', mover);
    tela.addEventListener('pointerdown', (e) => {
      mover(e);
      this._clicou = true;
      this.usouGesto = true;
    });
    tela.addEventListener('pointerleave', () => (this.ponteiro.dentro = false));
  }

  get aspecto() {
    return this.robo ? 16 / 9 : this.camera.aspecto;
  }

  get estado() {
    return this.robo ? 'pronta' : this.camera.estado;
  }

  iniciar() {
    if (!this.robo) this.camera.iniciar();
  }

  definirJogadores(n) {
    this.n = n;
    this.rastreador = new Rastreador(n);
    if (!this.robo) this.camera.definirPoses(n);
    this.recalibrar();
  }

  recalibrar() {
    for (const jog of this.j) {
      jog.leitor.fator = SENSIBILIDADES[opcoes.sensibilidade] || 1;
      jog.leitor.reiniciar();
      jog.cursor.reiniciar();
      jog.presente = false;
      jog.calibrado = false;
    }
  }

  // Um quadro sintético por chamada, como se viesse da câmera.
  quadrosRobo(t) {
    if (t - this.ultimoRobo < 1 / 31) return [];
    this.ultimoRobo = t;
    const centros = this.n === 1 ? [0.5] : [0.28, 0.72];
    const poses = centros.map((centro, i) => {
      const corpo = this.roboCorpo[i] ? this.roboCorpo[i](t) : ANIMACOES.parado((t / 3) % 1);
      return paraCamera(corpo, { centro, escala: 0.14, chao: 0.95 });
    });
    return [{ tempo: t, poses }];
  }

  /** Chamar uma vez por quadro. `t` = tempo do app em segundos. `escala` converte o ponteiro para a tela lógica. */
  atualizar(t, converter) {
    this.teclas = this._teclas;
    this._teclas = new Set();
    this.ponteiro.clicou = this._clicou;
    this._clicou = false;
    if (this.ponteiro.px !== undefined) Object.assign(this.ponteiro, converter(this.ponteiro.px, this.ponteiro.py));

    for (const jog of this.j) jog.eventos = [];
    const novos = this.robo ? this.quadrosRobo(t) : this.camera.processar();
    for (const { tempo, poses } of novos) {
      const atribuicao = this.rastreador.atribuir(poses);
      for (let i = 0; i < this.n; i++) {
        const jog = this.j[i];
        const L = jog.leitor;
        const r = L.atualizar(atribuicao[i], tempo, this.aspecto);
        jog.presente = r.presente;
        jog.calibrado = r.calibrado;
        jog.segurando = r.segurando;
        jog.medidas = r.medidas;
        for (const [nome, rep] of Object.entries(r.reps)) jog.eventos.push({ nome, ...rep });
        for (const [nome, c] of Object.entries(L.contadores)) jog.niveis[nome] = c.nivel;
        jog.cursor.atualizar(L.q, L.ombro, (L.base && L.base.tronco) || L.tronco, tempo);
      }
      for (let i = this.n; i < 2; i++) {
        this.j[i].presente = false;
        this.j[i].cursor.ativo = false;
      }
      this.espaco = this.n === 2 ? medirEspaco(this.corpo(0), this.corpo(1)) : null;
    }
    return this;
  }

  corpo(i) {
    const L = this.j[i].leitor;
    if (!L.q || !this.j[i].presente) return null;
    return { q: L.q, quadril: L.quadril, T: (L.base && L.base.tronco) || L.tronco };
  }

  tecla(...codigos) {
    return codigos.some((k) => this.teclas.has(k));
  }
}
