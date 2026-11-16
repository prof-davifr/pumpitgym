// Leitura dos exercícios a partir dos 33 pontos do corpo de uma pessoa.
// Lógica pura (sem DOM): os testes rodam no Node com poses sintéticas (js/motor/poses.js).
//
// Unidades: "T" é o comprimento do tronco (meio dos ombros → meio do quadril) e "perna" é a distância
// do quadril ao tornozelo, os dois medidos em pé na calibração. Assim os limiares valem para adulto
// ou criança, perto ou longe da câmera.
import { LIMIARES } from '../config.js';
import { FiltroUmEuro } from './gestos.js';

export const P = {
  nariz: 0,
  ombroE: 11, ombroD: 12,
  cotoveloE: 13, cotoveloD: 14,
  pulsoE: 15, pulsoD: 16,
  quadrilE: 23, quadrilD: 24,
  joelhoE: 25, joelhoD: 26,
  tornozeloE: 27, tornozeloD: 28,
};

const USADOS = Object.entries(P);

const limitar = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, v: Math.min(a.v, b.v) });

// Ângulo em graus no ponto b, entre os segmentos b→a e b→c.
export function angulo(a, b, c) {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n === 0) return 180;
  return (Math.acos(limitar((v1x * v2x + v1y * v2y) / n, -1, 1)) * 180) / Math.PI;
}

// Direção do braço em graus: 0 = para baixo, 90 = para o lado de fora, 180 = para cima.
// `lado` = -1 para o braço da esquerda da tela, 1 para o da direita.
export function direcaoBraco(ombro, pulso, lado) {
  return (Math.atan2((pulso.x - ombro.x) * lado, pulso.y - ombro.y) * 180) / Math.PI;
}

// ---------------------------------------------------------------------------
// Contadores: cada um recebe as medidas do quadro e devolve { rep, qualidade } quando uma repetição
// termina. `nivel` (0..1) mostra na tela o quanto falta para a repetição valer.

// A repetição leva também os tempos da descida e da subida e a amplitude: a perda de velocidade
// na subida é o sinal de fadiga (js/motor/fadiga.js).
class Agachamento {
  constructor() {
    this.estado = 'cima';
    this.max = 0;
    this.nivel = 0;
    this.tInicio = null; // começo da descida
    this.tFundo = 0;     // momento do ponto mais baixo
  }
  atualizar(m, l, f, t) {
    const desce = l.agachamentoDesce * f;
    const sobe = l.agachamentoSobe * f;
    this.nivel = limitar(m.profundidade / desce);
    if (!m.emPe) {
      this.estado = 'cima';
      this.tInicio = null;
      return null;
    }
    if (this.estado === 'cima') {
      if (m.profundidade < sobe) this.tInicio = null;
      else if (this.tInicio === null) this.tInicio = t;
      if (m.profundidade > desce) {
        this.estado = 'baixo';
        this.max = m.profundidade;
        this.tFundo = t;
      }
    } else {
      if (m.profundidade > this.max) {
        this.max = m.profundidade;
        this.tFundo = t;
      }
      if (m.profundidade < sobe) {
        this.estado = 'cima';
        const subida = Math.max(1 / 60, t - this.tFundo);
        const descida = this.tInicio === null ? null : Math.max(0, this.tFundo - this.tInicio);
        this.tInicio = null;
        return {
          qualidade: limitar(0.5 + (0.5 * (this.max - desce)) / (l.agachamentoBom * f - desce)),
          amplitude: this.max,
          subida,
          descida,
          velocidade: (this.max - sobe) / subida, // fração da perna por segundo
        };
      }
    }
    return null;
  }
}

// Elevação de panturrilha: o corpo sobe na ponta dos pés, devagar, e desce.
class Panturrilha {
  constructor() {
    this.estado = 'baixo';
    this.t = 0;
    this.max = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f, t) {
    const sobe = l.panturrilhaSobe * f;
    this.nivel = limitar(m.altura / sobe);
    if (!m.emPe) {
      this.estado = 'baixo';
      return null;
    }
    if (this.estado === 'baixo') {
      if (m.altura > sobe) {
        this.estado = 'alto';
        this.t = t;
        this.max = m.altura;
      }
    } else {
      this.max = Math.max(this.max, m.altura);
      if (m.altura < l.panturrilhaDesce * f) {
        this.estado = 'baixo';
        // muito alto = pulo, e não ponta dos pés
        if (t - this.t >= l.panturrilhaTempo && this.max < 0.3) return { qualidade: limitar(0.5 + this.max / (sobe * 4)), amplitude: this.max };
      }
    }
    return null;
  }
}

// Abdução de quadril em pé: uma perna abre para o lado e volta; a outra fica no chão.
class Abducao {
  constructor() {
    this.lado = -1; // perna aberta (0 ou 1), ou -1
    this.max = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    if (!m.emPe || !m.tornozelos) return null;
    const sobe = l.abducaoSobe * f;
    const [e, d] = m.tornozelos;
    this.nivel = limitar((Math.max(e, d) - l.abducaoDesce) / (sobe - l.abducaoDesce));
    if (this.lado === -1) {
      const k = e > d ? 0 : 1;
      // as duas pernas abertas é só uma base larga
      if (m.tornozelos[k] > sobe && m.tornozelos[1 - k] < l.abducaoDesce) {
        this.lado = k;
        this.max = m.tornozelos[k];
      }
    } else {
      this.max = Math.max(this.max, m.tornozelos[this.lado]);
      if (m.tornozelos[this.lado] < l.abducaoDesce) {
        const lado = this.lado;
        this.lado = -1;
        return { qualidade: limitar(0.6 + (this.max - sobe) * 1.2), lado, amplitude: this.max };
      }
    }
    return null;
  }
}

// Afundo parado: o quadril desce com uma perna à frente e a outra atrás.
class Afundo {
  constructor() {
    this.estado = 'cima';
    this.max = 0;
    this.pernas = 0;
    this.tFundo = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f, t) {
    const desce = l.afundoDesce * f;
    this.nivel = limitar(m.profundidade / desce);
    if (!m.emPe) {
      this.estado = 'cima';
      return null;
    }
    const pernas = m.passo === null ? 0 : Math.abs(m.passo);
    if (this.estado === 'cima') {
      if (m.profundidade > desce) {
        this.estado = 'baixo';
        this.max = m.profundidade;
        this.pernas = pernas;
        this.tFundo = t;
      }
    } else {
      this.pernas = Math.max(this.pernas, pernas);
      if (m.profundidade > this.max) {
        this.max = m.profundidade;
        this.tFundo = t;
      }
      if (m.profundidade < l.afundoSobe * f) {
        this.estado = 'cima';
        if (this.pernas < l.afundoPernas) return null; // pernas iguais: foi um agachamento
        const subida = Math.max(1 / 60, t - this.tFundo);
        return { qualidade: limitar(0.5 + (this.max - desce) * 3), amplitude: this.max, subida, velocidade: this.max / subida };
      }
    }
    return null;
  }
}

// Ponte de glúteo: deitado de costas e de lado para a câmera, o quadril sobe acima do ombro.
class Ponte {
  constructor() {
    this.estado = 'baixo';
    this.max = 0;
    this.tInicio = null;
    this.nivel = 0;
  }
  atualizar(m, l, f, t) {
    if (m.ponte === null) {
      this.estado = 'baixo';
      this.nivel = 0;
      return null;
    }
    const sobe = l.ponteSobe * f;
    this.nivel = limitar(m.ponte / sobe);
    if (this.estado === 'baixo') {
      if (m.ponte > l.ponteDesce && this.tInicio === null) this.tInicio = t;
      if (m.ponte <= l.ponteDesce) this.tInicio = null;
      if (m.ponte > sobe) {
        this.estado = 'cima';
        this.max = m.ponte;
        return { qualidade: 0.8, amplitude: m.ponte, subida: this.tInicio === null ? null : Math.max(1 / 60, t - this.tInicio) };
      }
    } else if (m.ponte < l.ponteDesce) {
      this.estado = 'baixo';
      this.tInicio = null;
    }
    return null;
  }
}

class Pulo {
  constructor() {
    this.estado = 'pronto';
    this.t = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f, t) {
    this.nivel = limitar(m.altura / (l.puloAltura * f));
    if (this.estado === 'pronto') {
      if (m.emPe && m.altura > l.puloAltura * f && m.velocidade > l.puloVelocidade * f) {
        this.estado = 'ar';
        this.t = t;
        return { qualidade: limitar(m.altura / (l.puloAltura * 2.5)) * 0.5 + 0.5 };
      }
    } else if (m.altura < l.puloRearme || t - this.t > l.puloTempoMax) {
      this.estado = 'pronto';
    }
    return null;
  }
}

class Polichinelo {
  constructor() {
    this.estado = 'fechado';
    this.pernas = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    if (!m.emPe || m.bracos === null) return null;
    // altura média dos pulsos acima dos ombros (positivo = acima)
    const sobe = l.polichineloSobe * f;
    this.nivel = limitar((m.bracos + l.polichineloDesce) / (sobe + l.polichineloDesce));
    if (this.estado === 'fechado') {
      if (m.bracos > sobe && m.bracosMin > sobe * 0.3) {
        this.estado = 'aberto';
        const pernas = m.pernasAbertas;
        return { qualidade: pernas === null ? 0.8 : pernas > l.polichineloPernas ? 1 : 0.6 };
      }
    } else if (m.bracos < -l.polichineloDesce * f) {
      this.estado = 'fechado';
    }
    return null;
  }
}

// Corrida no lugar e joelho alto: um pé (ou joelho) acima do outro, alternando.
class Passos {
  constructor(alto) {
    this.alto = alto;
    this.lado = 0; // lado que está em cima (-1, 1) ou 0
    this.ultimoLado = 0;
    this.tempos = [];
    this.nivel = 0;
  }
  atualizar(m, l, f, t) {
    if (!m.emPe || m.passo === null) return null;
    const sobe = (this.alto ? l.joelhoAltoSobe : l.corridaSobe) * f;
    const dif = this.alto ? m.joelhos : m.passo;
    if (dif === null) return null;
    this.nivel = limitar(Math.abs(dif) / sobe);
    if (this.lado === 0) {
      if (Math.abs(dif) > sobe) {
        this.lado = Math.sign(dif);
        const alternou = this.lado !== this.ultimoLado;
        this.ultimoLado = this.lado;
        this.tempos.push(t);
        return { qualidade: alternou ? 1 : 0.7 };
      }
    } else if (Math.abs(dif) < l.corridaDesce * f || Math.sign(dif) !== this.lado) {
      this.lado = 0;
    }
    return null;
  }
  // passos por segundo nos últimos 2 segundos
  cadencia(t) {
    this.tempos = this.tempos.filter((x) => t - x < 2);
    return this.tempos.length / 2;
  }
}

class SocoAlto {
  constructor() {
    this.cima = [false, false];
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    if (!m.emPe) return null;
    let r = null;
    let nivel = 0;
    for (let k = 0; k < 2; k++) {
      const a = m.socos[k];
      if (a === null) continue;
      nivel = Math.max(nivel, limitar((a + 0.6) / (0.6 + l.socoAltoSobe * f)));
      if (!this.cima[k] && a > l.socoAltoSobe * f) {
        this.cima[k] = true;
        r = { qualidade: 1, lado: k };
      } else if (this.cima[k] && a < -0.5) {
        this.cima[k] = false;
      }
    }
    this.nivel = nivel;
    return r;
  }
}

// Flexão (apoio): o ombro desce em direção ao pulso, que fica no chão.
// Vale de lado para a câmera ou de frente para ela.
class Flexao {
  constructor() {
    this.estado = 'cima';
    this.alto = 0; // altura do ombro sobre o pulso na posição de cima
    this.min = 1;
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    const b = m.apoio;
    if (!m.noChao || !b) {
      this.estado = 'cima';
      this.alto = 0;
      this.nivel = 0;
      return null;
    }
    if (this.estado === 'cima') this.alto = Math.max(b.altura, this.alto * 0.997);
    if (this.alto <= 0) return null;
    const r = b.altura / this.alto;
    const desce = 1 - (1 - l.flexaoDesce) / f;
    this.nivel = limitar((1 - r) / (1 - desce));
    if (this.estado === 'cima') {
      if (r < desce || (b.cotovelo !== null && b.cotovelo < l.flexaoCotovelo / f && r < 0.9)) {
        this.estado = 'baixo';
        this.min = r;
      }
    } else {
      this.min = Math.min(this.min, r);
      if (r > l.flexaoSobe) {
        this.estado = 'cima';
        return { qualidade: limitar(0.5 + (desce - this.min) * 2.5) };
      }
    }
    return null;
  }
}

class Abdominal {
  constructor() {
    this.estado = 'baixo';
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    if (!m.sentadoOuDeitado) {
      this.estado = 'baixo';
      this.nivel = 0;
      return null;
    }
    const sobe = l.abdominalSobe * f;
    this.nivel = limitar((m.troncoErguido - l.abdominalDesce) / (sobe - l.abdominalDesce));
    if (this.estado === 'baixo') {
      if (m.troncoErguido > sobe && m.jaDeitou) {
        this.estado = 'cima';
        return { qualidade: limitar(m.troncoErguido / (sobe * 1.4)) * 0.5 + 0.5 };
      }
    } else if (m.troncoErguido < l.abdominalDesce) {
      this.estado = 'baixo';
    }
    return null;
  }
}

class SaltoLateral {
  constructor() {
    this.lado = 0;
    this.nivel = 0;
  }
  atualizar(m, l, f) {
    if (!m.emPe) return null;
    const lim = l.saltoLateral * f;
    this.nivel = limitar(Math.abs(m.lado) / lim);
    if (m.lado > lim && this.lado !== 1) {
      const vale = this.lado !== 0;
      this.lado = 1;
      if (vale) return { qualidade: 1 };
    } else if (m.lado < -lim && this.lado !== -1) {
      const vale = this.lado !== 0;
      this.lado = -1;
      if (vale) return { qualidade: 1 };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------

export class LeitorCorpo {
  constructor(limiares = LIMIARES, fator = 1) {
    this.l = limiares;
    this.fator = fator;
    this.filtros = {};
    for (const [nome] of USADOS) this.filtros[nome] = [new FiltroUmEuro(1.6, 3.0), new FiltroUmEuro(1.6, 3.0)];
    this.reiniciar();
  }

  reiniciar() {
    this.base = null;
    this.amostras = [];
    this.ultimoT = null;
    this.ultimaAltura = 0;
    this.ultimoVisto = null;
    this.paradoDesde = null;
    this.ladoRef = null;
    this.jaDeitou = false;
    this.baseFirme = false; // true: a base só acompanha a pessoa bem perto da altura normal (ponta dos pés)
    this.q = null;          // pontos filtrados do último quadro (para o desenho e o cursor da mão)
    this.tronco = null;     // comprimento do tronco no último quadro
    this.contadores = {
      agachamento: new Agachamento(),
      pulo: new Pulo(),
      polichinelo: new Polichinelo(),
      corrida: new Passos(false),
      joelhoAlto: new Passos(true),
      socoAlto: new SocoAlto(),
      flexao: new Flexao(),
      abdominal: new Abdominal(),
      saltoLateral: new SaltoLateral(),
      panturrilha: new Panturrilha(),
      abducao: new Abducao(),
      afundo: new Afundo(),
      ponte: new Ponte(),
    };
    for (const par of Object.values(this.filtros)) for (const f of par) f.reiniciar();
    this.medidas = null;
  }

  get calibrado() {
    return this.base !== null;
  }

  get progressoCalibracao() {
    return this.base ? 1 : this.amostras.length / 30;
  }

  calibrar() {
    this.base = null;
    this.amostras = [];
  }

  // Lê os pontos com o filtro, espelhados (como um espelho) e com x na mesma escala do y.
  ler(pontos, t, aspecto) {
    const vmin = this.l.visibilidade;
    const q = {};
    for (const [nome, i] of USADOS) {
      const p = pontos[i];
      if (!p) {
        q[nome] = null;
        continue;
      }
      const [fx, fy] = this.filtros[nome];
      const v = p.visibility === undefined ? 1 : p.visibility;
      q[nome] = { x: fx.filtrar((1 - p.x) * aspecto, t), y: fy.filtrar(p.y, t), v, ok: v >= vmin };
    }
    return q;
  }

  /**
   * @param {Array|null} pontos os 33 pontos normalizados do MediaPipe, ou null
   * @param {number} t tempo em segundos
   * @returns {{presente, calibrado, reps: Object, segurando: Object, medidas}}
   */
  atualizar(pontos, t, aspecto = 16 / 9) {
    const l = this.l;
    const f = this.fator;
    const saida = { presente: false, calibrado: this.calibrado, reps: {}, segurando: {}, medidas: null, cadencia: 0 };
    if (!pontos) this.q = null;
    // basta um ombro e um quadril: deitado de lado, os pontos do lado de lá às vezes somem
    const vis = (i) => pontos && pontos[i] && (pontos[i].visibility ?? 1) >= l.visibilidade;
    const ok = pontos && (vis(P.ombroE) || vis(P.ombroD)) && (vis(P.quadrilE) || vis(P.quadrilD));
    if (!ok) {
      this.q = null;
      saida.presente = this.ultimoVisto !== null && t - this.ultimoVisto < 1;
      saida.cadencia = this.contadores.corrida.cadencia(t);
      return saida;
    }
    this.ultimoVisto = t;
    saida.presente = true;
    const q = this.ler(pontos, t, aspecto);
    const juntar = (a, b) => (a.ok && b.ok ? meio(a, b) : a.ok ? a : b);
    const ombro = juntar(q.ombroE, q.ombroD);
    const quadril = juntar(q.quadrilE, q.quadrilD);
    const tronco = dist(ombro, quadril);
    this.q = q;
    this.tronco = tronco;
    this.ombro = ombro;
    this.quadril = quadril;
    // em pé: o ombro bem acima do quadril
    const vertical = (quadril.y - ombro.y) / Math.max(1e-6, tronco);
    const pes = q.tornozeloE && q.tornozeloD && q.tornozeloE.ok && q.tornozeloD.ok;

    // ---- calibração: parado, em pé, com o corpo todo visível
    if (!this.base) {
      if (vertical > 0.85) {
        this.amostras.push({ ombro, quadril, tronco, q });
        if (this.amostras.length > 3) {
          const ys = this.amostras.map((a) => a.quadril.y);
          if ((Math.max(...ys) - Math.min(...ys)) / tronco > 0.12) this.amostras = this.amostras.slice(-2);
        }
        if (this.amostras.length >= 30) this.definirBase(this.amostras);
      } else {
        this.amostras = [];
      }
      saida.calibrado = this.calibrado;
      this.ultimoT = t;
      return saida;
    }

    const b = this.base;
    const T = b.tronco;
    const dt = this.ultimoT === null ? 1 / 30 : Math.max(1 / 120, t - this.ultimoT);
    this.ultimoT = t;
    const altura = (b.quadrilY - quadril.y) / T;
    const velocidade = (altura - this.ultimaAltura) / dt;
    this.ultimaAltura = altura;
    const emPe = vertical > 0.6 && quadril.y < b.quadrilY + b.perna * 0.6;

    const m = {
      emPe,
      altura,
      velocidade,
      profundidade: (quadril.y - b.quadrilY) / b.perna,
      lado: 0,
      bracos: null,
      bracosMin: null,
      pernasAbertas: null,
      passo: null,
      joelhos: null,
      socos: [null, null],
      tornozelos: null,
      ponte: null,
      noChao: false,
      apoio: null,
      sentadoOuDeitado: false,
      troncoErguido: (quadril.y - ombro.y) / T,
      jaDeitou: false,
      vertical,
    };

    // referência horizontal que segue a pessoa devagar (para o salto lateral)
    if (this.ladoRef === null) this.ladoRef = quadril.x;
    this.ladoRef += (quadril.x - this.ladoRef) * Math.min(1, dt / 2.5);
    m.lado = (quadril.x - this.ladoRef) / T;

    // braços: altura dos pulsos acima da linha dos ombros (em T)
    if (q.pulsoE.ok && q.pulsoD.ok) {
      const aE = (ombro.y - q.pulsoE.y) / T;
      const aD = (ombro.y - q.pulsoD.y) / T;
      m.bracos = (aE + aD) / 2;
      m.bracosMin = Math.min(aE, aD);
    }
    if (q.nariz && q.nariz.ok) {
      m.socos = [q.pulsoE, q.pulsoD].map((p) => (p.ok ? (q.nariz.y - p.y) / T : null));
    }
    if (pes) {
      m.pernasAbertas = (Math.abs(q.tornozeloE.x - q.tornozeloD.x) - b.pes) / T;
      // positivo = o pé da direita está mais alto
      m.passo = (q.tornozeloE.y - q.tornozeloD.y) / T;
      // distância de cada tornozelo ao meio do quadril, para o lado
      m.tornozelos = [Math.abs(quadril.x - q.tornozeloE.x) / T, Math.abs(q.tornozeloD.x - quadril.x) / T];
    }
    if (q.joelhoE.ok && q.joelhoD.ok) {
      m.joelhos = (q.joelhoE.y - q.joelhoD.y) / T;
      if (m.passo === null || Math.abs(m.joelhos) > Math.abs(m.passo)) m.passo = m.joelhos;
    }

    // ---- no chão: o ombro abaixo da altura do quadril em pé
    // (ou deitado mais longe da câmera: tronco quase na horizontal e ombro bem abaixo do normal)
    m.noChao = ombro.y > b.quadrilY + T * 0.15 || (vertical < 0.55 && ombro.y > b.ombroY + T * 0.8);
    if (m.noChao) {
      // o braço mais visível sustenta o corpo
      const lados = [
        [q.ombroE, q.cotoveloE, q.pulsoE],
        [q.ombroD, q.cotoveloD, q.pulsoD],
      ].filter(([o, c, p]) => o.ok && p.ok);
      lados.sort((a, z) => z[2].v + z[1].v - (a[2].v + a[1].v));
      if (lados.length) {
        const [o, c, p] = lados[0];
        if (p.y > o.y) m.apoio = { altura: (p.y - o.y) / T, cotovelo: c.ok ? angulo(o, c, p) : null };
      }
    }
    if (m.noChao) m.ponte = (ombro.y - quadril.y) / T;
    // abdominal: o quadril perto do chão (sentado ou deitado)
    m.sentadoOuDeitado = quadril.y > b.quadrilY + b.perna * 0.45;
    if (m.sentadoOuDeitado && m.troncoErguido < l.abdominalDesce) this.jaDeitou = true;
    if (emPe) this.jaDeitou = false;
    m.jaDeitou = this.jaDeitou;

    // ---- repetições
    for (const [nome, c] of Object.entries(this.contadores)) {
      const r = c.atualizar(m, l, f, t);
      if (r) saida.reps[nome] = r;
    }
    saida.cadencia = this.contadores.corrida.cadencia(t);

    // ---- posições seguradas
    const s = saida.segurando;
    s.cadeirinha = emPe && m.profundidade > l.cadeirinha * f;
    s.prancha = m.noChao && m.troncoErguido < 0.5 && !!m.apoio;
    s.bracos = m.bracosMin !== null && q.nariz && q.nariz.ok && Math.min(q.nariz.y - q.pulsoE.y, q.nariz.y - q.pulsoD.y) / T > 0.05;
    s.flamingo = emPe && Math.abs(altura) < 0.25 && m.passo !== null && Math.abs(m.passo) > l.flamingo * f;
    s.emPe = emPe;

    // ---- a base acompanha devagar quando a pessoa está parada e em pé
    const parado = emPe && Math.abs(velocidade) < 0.4 && Math.abs(altura) < (this.baseFirme ? 0.03 : 0.08) && vertical > 0.85;
    if (parado) {
      const a = 0.02;
      b.quadrilY += (quadril.y - b.quadrilY) * a;
      b.ombroY += (ombro.y - b.ombroY) * a;
      b.tronco += (tronco - b.tronco) * a;
      if (pes) b.tornozeloY += ((q.tornozeloE.y + q.tornozeloD.y) / 2 - b.tornozeloY) * a;
    }
    // em pé e parado com outro tamanho (chegou perto ou foi longe da câmera) por 1 s: refaz a base
    if (vertical > 0.85 && Math.abs(velocidade) < 0.4 && Math.abs(tronco / T - 1) > 0.2) {
      if (this.paradoDesde === null) this.paradoDesde = t;
      if (t - this.paradoDesde > 1) {
        this.definirBase([{ ombro, quadril, tronco, q }]);
        this.paradoDesde = null;
      }
    } else {
      this.paradoDesde = null;
    }

    // medidas para o desenho do boneco e para a Parede Maluca
    m.pose = medirPose(q, ombro, quadril, T, b);
    saida.medidas = m;
    this.medidas = m;
    return saida;
  }

  definirBase(amostras) {
    const n = amostras.length;
    const med = (fn) => amostras.reduce((s, a) => s + fn(a), 0) / n;
    const tronco = med((a) => a.tronco);
    const quadrilY = med((a) => a.quadril.y);
    const comPes = amostras.filter((a) => a.q.tornozeloE && a.q.tornozeloE.ok && a.q.tornozeloD && a.q.tornozeloD.ok);
    const tornozeloY = comPes.length ? comPes.reduce((s, a) => s + (a.q.tornozeloE.y + a.q.tornozeloD.y) / 2, 0) / comPes.length : quadrilY + tronco * 1.75;
    const pes = comPes.length ? comPes.reduce((s, a) => s + Math.abs(a.q.tornozeloE.x - a.q.tornozeloD.x), 0) / comPes.length : tronco * 0.4;
    this.base = {
      tronco,
      quadrilY,
      quadrilX: med((a) => a.quadril.x),
      ombroY: med((a) => a.ombro.y),
      tornozeloY,
      perna: Math.max(tronco * 1.2, tornozeloY - quadrilY),
      pes,
    };
    this.ultimaAltura = 0;
    this.ladoRef = this.base.quadrilX;
  }
}

// Ângulos dos braços, abertura das pernas e profundidade, para comparar com uma pose pedida.
export function medirPose(q, ombro, quadril, T, b) {
  const pose = {
    bracoE: q.pulsoE.ok ? direcaoBraco(q.ombroE, q.pulsoE, -1) : null,
    bracoD: q.pulsoD.ok ? direcaoBraco(q.ombroD, q.pulsoD, 1) : null,
    pernas: q.tornozeloE.ok && q.tornozeloD.ok ? (Math.abs(q.tornozeloE.x - q.tornozeloD.x) - b.pes) / T : null,
    profundidade: (quadril.y - b.quadrilY) / b.perna,
    pe: 0,
  };
  if (q.tornozeloE.ok && q.tornozeloD.ok) {
    const d = (q.tornozeloE.y - q.tornozeloD.y) / T;
    if (Math.abs(d) > 0.2) pose.pe = d > 0 ? 1 : -1;
  }
  return pose;
}

// Nota de 0 a 1: quanto a pose medida se parece com a pose pedida.
// alvo: { bracoE, bracoD (graus), pernas: 'juntas'|'abertas'|null, agachado: bool, pe: -1|0|1|null }
export function compararPose(pose, alvo) {
  if (!pose) return 0;
  const notas = [];
  for (const k of ['bracoE', 'bracoD']) {
    if (alvo[k] === undefined || alvo[k] === null) continue;
    if (pose[k] === null) {
      notas.push(0.3);
      continue;
    }
    let d = Math.abs(pose[k] - alvo[k]);
    if (d > 180) d = 360 - d;
    notas.push(limitar(1 - (d - 25) / 55));
  }
  if (alvo.pernas === 'abertas') notas.push(pose.pernas === null ? 0.5 : limitar((pose.pernas - 0.1) / 0.3));
  if (alvo.pernas === 'juntas') notas.push(pose.pernas === null ? 0.5 : limitar(1 - (pose.pernas - 0.25) / 0.3));
  if (alvo.agachado === true) notas.push(limitar((pose.profundidade - 0.05) / 0.12));
  if (alvo.agachado === false) notas.push(limitar(1 - (pose.profundidade - 0.12) / 0.1));
  if (alvo.pe === 2) notas.push(pose.pe !== 0 ? 1 : 0);
  else if (alvo.pe !== undefined && alvo.pe !== null) notas.push(alvo.pe === 0 ? (pose.pe === 0 ? 1 : 0.3) : pose.pe !== 0 ? 1 : 0);
  if (!notas.length) return 0;
  return Math.min(...notas) * 0.5 + (notas.reduce((s, n) => s + n, 0) / notas.length) * 0.5;
}
