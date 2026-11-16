// Fadiga e perda de desempenho dentro de um bloco de exercício.
//
// Critério principal: perda de velocidade na subida de cada repetição em relação às repetições mais
// rápidas do bloco. A perda de velocidade acompanha a fadiga neuromuscular e metabólica
// (Sánchez-Medina & González-Badillo, Med Sci Sports Exerc 2011). Quando o exercício não dá a
// velocidade, valem a perda de amplitude e a queda de ritmo (intervalo entre repetições).
// Lógica pura (sem DOM), assim os testes rodam no Node.
import { FADIGA } from '../config.js';

const media = (v) => v.reduce((s, x) => s + x, 0) / v.length;

// 1 - (média das 2 últimas) / (média das 3 melhores). `maior` = quanto maior, melhor.
function perda(valores, minimo, maior = true) {
  if (valores.length < minimo) return 0;
  const ordenados = [...valores].sort((a, b) => (maior ? b - a : a - b));
  const melhores = media(ordenados.slice(0, 3));
  const ultimos = media(valores.slice(-2));
  if (melhores <= 0 || ultimos <= 0) return 0;
  const p = maior ? 1 - ultimos / melhores : 1 - melhores / ultimos;
  return Math.max(0, Math.min(1, p));
}

export class Fadiga {
  constructor(limites = FADIGA) {
    this.l = limites;
    this.velocidades = [];
    this.amplitudes = [];
    this.tempos = [];
  }

  /** Registra uma repetição. r = { velocidade?, amplitude? } vindos do contador. */
  registrar(t, r = {}) {
    if (r.velocidade > 0) this.velocidades.push(r.velocidade);
    if (r.amplitude > 0) this.amplitudes.push(r.amplitude);
    this.tempos.push(t);
  }

  get repeticoes() {
    return this.tempos.length;
  }

  get perdaVelocidade() {
    return perda(this.velocidades, this.l.minimo);
  }

  get perdaAmplitude() {
    return perda(this.amplitudes, this.l.minimo);
  }

  // queda do ritmo: o intervalo entre repetições cresce
  get perdaCadencia() {
    const intervalos = [];
    for (let i = 1; i < this.tempos.length; i++) intervalos.push(this.tempos[i] - this.tempos[i - 1]);
    return perda(intervalos, this.l.minimo, false);
  }

  // 0 = sem sinal de fadiga; 1 = sinal máximo
  get indice() {
    const l = this.l;
    const ritmo = (this.perdaCadencia * l.parar) / l.cadenciaParar; // o ritmo varia mais: pesa menos
    return Math.max(this.perdaVelocidade, this.perdaAmplitude, ritmo);
  }

  get nivel() {
    const i = this.indice;
    return i >= this.l.parar ? 'parar' : i >= this.l.atencao ? 'atencao' : 'ok';
  }
}
