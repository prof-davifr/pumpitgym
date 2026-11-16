// Som: música synthwave original feita com WebAudio, efeitos curtos e a voz do navegador.
// Também toca um arquivo de áudio do aparelho no lugar da música ("minha música").
import { opcoes } from '../config.js';

// Lá menor – Fá – Dó – Sol. Cada acorde dura um compasso de 4 tempos.
const ACORDES = [
  { baixo: 110.0, notas: [220.0, 261.63, 329.63] },
  { baixo: 87.31, notas: [174.61, 220.0, 261.63] },
  { baixo: 130.81, notas: [261.63, 329.63, 392.0] },
  { baixo: 98.0, notas: [196.0, 246.94, 293.66] },
];
const ARPEJO = [0, 1, 2, 1, 0, 2, 1, 2];

export class Audio {
  constructor() {
    this.ctx = null;
    this.bpm = 124;
    this.estilo = null; // null | 'menu' | 'treino' | 'danca'
    this.proximo = 0; // tempo do próximo meio tempo a agendar
    this.passo = 0;
    this.arquivo = null; // elemento <audio> da música do usuário
    this.nomeArquivo = '';
    setInterval(() => this.agendar(), 25);
  }

  // Precisa de um clique ou tecla antes (regra dos navegadores).
  ligar() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.mestre = this.ctx.createGain();
      this.mestre.connect(this.ctx.destination);
      this.saidaMusica = this.ctx.createGain();
      this.saidaMusica.gain.value = 0.55;
      this.saidaMusica.connect(this.mestre);
      // eco curto para o arpejo
      this.eco = this.ctx.createDelay(1);
      const retorno = this.ctx.createGain();
      retorno.gain.value = 0.3;
      this.eco.connect(retorno).connect(this.eco);
      this.eco.connect(this.saidaMusica);
      this.ruido = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended' && !this.pausada) this.ctx.resume();
    this.ajustarVolume();
  }

  ajustarVolume() {
    if (this.mestre) this.mestre.gain.value = opcoes.volume;
    if (this.arquivo) this.arquivo.volume = opcoes.volume * 0.8;
  }

  // ---- música

  get bpmAtual() {
    return this.arquivo ? opcoes.bpmProprio : 124;
  }

  /** Começa a música do começo do compasso. estilo: 'menu' | 'treino' | 'danca' */
  tocar(estilo) {
    if (this.estilo === estilo) return;
    this.estilo = estilo;
    this.bpm = this.bpmAtual;
    this.passo = 0;
    if (this.ctx) this.proximo = this.ctx.currentTime + 0.06;
    if (this.arquivo) {
      if (estilo === 'menu') this.arquivo.pause();
      else {
        if (estilo === 'danca') this.arquivo.currentTime = 0;
        this.arquivo.play().catch(() => {});
      }
    }
  }

  parar() {
    this.estilo = null;
    if (this.arquivo) this.arquivo.pause();
  }

  pausar(sim) {
    this.pausada = sim;
    if (this.ctx) sim ? this.ctx.suspend() : this.ctx.resume();
    if (this.arquivo && this.estilo && this.estilo !== 'menu') sim ? this.arquivo.pause() : this.arquivo.play().catch(() => {});
  }

  usarArquivo(arquivo) {
    if (this.arquivo) {
      this.arquivo.pause();
      URL.revokeObjectURL(this.arquivo.src);
      this.arquivo = null;
      this.nomeArquivo = '';
    }
    if (!arquivo) return;
    const a = new window.Audio(URL.createObjectURL(arquivo));
    a.loop = true;
    this.arquivo = a;
    this.nomeArquivo = arquivo.name;
    this.ajustarVolume();
    const estilo = this.estilo;
    this.estilo = null;
    if (estilo) this.tocar(estilo);
  }

  agendar() {
    const c = this.ctx;
    if (!c || !this.estilo || c.state !== 'running') return;
    if (this.arquivo && this.estilo !== 'menu') return; // a música do usuário toca no lugar
    const meio = 30 / this.bpm; // meio tempo
    if (this.proximo < c.currentTime - 0.2) this.proximo = c.currentTime + 0.05;
    while (this.proximo < c.currentTime + 0.12) {
      this.tocarPasso(this.passo, this.proximo, meio);
      this.passo++;
      this.proximo += meio;
    }
  }

  tocarPasso(passo, t, meio) {
    const cheio = this.estilo !== 'menu';
    const noCompasso = passo % 8;
    const acorde = ACORDES[Math.floor(passo / 8) % ACORDES.length];
    if (cheio) {
      if (noCompasso % 2 === 0) this.bumbo(t);
      if (noCompasso === 2 || noCompasso === 6) this.caixa(t);
      this.chimbal(t, noCompasso % 2 ? 0.16 : 0.07);
      // baixo em colcheias, com a oitava no contratempo
      this.nota(acorde.baixo * (noCompasso % 2 ? 1 : 0.5), t, meio * 0.9, 'sawtooth', 0.3, 520, this.saidaMusica);
    }
    if (noCompasso === 0) for (const f of acorde.notas) this.nota(f, t, meio * 8, 'sawtooth', cheio ? 0.045 : 0.07, 900, this.saidaMusica, 0.4);
    // arpejo em semicolcheias
    for (let k = 0; k < 2; k++) {
      const f = acorde.notas[ARPEJO[(passo * 2 + k) % ARPEJO.length]] * 2;
      this.nota(f, t + (k * meio) / 2, meio * 0.45, 'square', cheio ? 0.05 : 0.04, 2600, this.eco);
    }
  }

  nota(freq, t, dur, tipo, ganho, corte, destino, ataque = 0.01) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = tipo;
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = corte;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(ganho, t + ataque);
    g.gain.setValueAtTime(ganho, t + dur * 0.7);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(f).connect(g).connect(destino);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  bumbo(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(this.saidaMusica);
    o.start(t);
    o.stop(t + 0.25);
  }

  barulho(t, dur, ganho, tipo, freq, destino = this.saidaMusica) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.ruido;
    const f = c.createBiquadFilter();
    f.type = tipo;
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(ganho, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(destino);
    s.start(t, Math.random() * 0.5, dur + 0.02);
  }

  caixa(t) {
    this.barulho(t, 0.22, 0.5, 'bandpass', 1800);
    this.nota(190, t, 0.1, 'triangle', 0.25, 2000, this.saidaMusica, 0.002);
  }

  chimbal(t, ganho) {
    this.barulho(t, 0.045, ganho, 'highpass', 7500);
  }

  // ---- efeitos

  bip(freq = 880, dur = 0.09, ganho = 0.25, tipo = 'square') {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.nota(freq, this.ctx.currentTime + 0.005, dur, tipo, ganho, 4000, this.mestre, 0.004);
  }

  efeito(nome) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    const toca = (f, quando, dur = 0.1, tipo = 'square', g = 0.2) => this.nota(f, t + quando, dur, tipo, g, 5000, this.mestre, 0.004);
    if (nome === 'rep') toca(660, 0, 0.07), toca(990, 0.05, 0.08);
    else if (nome === 'escolher') toca(523, 0, 0.08), toca(784, 0.07, 0.08), toca(1047, 0.14, 0.14);
    else if (nome === 'foco') toca(440, 0, 0.04, 'triangle', 0.12);
    else if (nome === 'contagem') toca(440, 0, 0.12, 'triangle', 0.3);
    else if (nome === 'vai') toca(880, 0, 0.3, 'triangle', 0.3);
    else if (nome === 'aviso') toca(196, 0, 0.16, 'sawtooth', 0.25), toca(156, 0.16, 0.22, 'sawtooth', 0.25);
    else if (nome === 'otimo') toca(784, 0, 0.07), toca(1175, 0.06, 0.07), toca(1568, 0.12, 0.12);
    else if (nome === 'bom') toca(784, 0, 0.07), toca(988, 0.06, 0.1);
    else if (nome === 'fim') [523, 659, 784, 1047, 1319].forEach((f, i) => toca(f, i * 0.11, 0.2, 'square', 0.22));
  }

  // ---- voz

  falar(texto) {
    if (!opcoes.voz || typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(texto.toLowerCase());
      u.lang = 'pt-BR';
      u.rate = 1.05;
      u.volume = Math.min(1, opcoes.volume * 1.3);
      speechSynthesis.speak(u);
    } catch {
      // sem voz neste navegador
    }
  }
}
