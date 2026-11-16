// Poses sintéticas: os 33 pontos do corpo no formato do MediaPipe, gerados por um boneco simples.
// Servem para quatro coisas: a demonstração de cada exercício na tela, as poses da dança,
// o jogador automático (?robo=1) e os testes da leitura dos exercícios (testes/corpo.test.mjs).
//
// O boneco usa o tronco como unidade (T = 1) e a altura acima do chão (y para cima).
// Depois os pontos viram coordenadas da imagem da câmera (x não espelhado, y para baixo).

const OMBRO = 0.27; // meia largura dos ombros
const QUADRIL = 0.17;
const BRACO = 0.6;
const ANTEBRACO = 0.55;
const COXA = 0.9;
const CANELA = 0.85;
const TORNOZELO = 0.07; // altura do tornozelo acima do chão
const PESCOCO = 0.42;
export const ALTURA_QUADRIL = TORNOZELO + COXA + CANELA;

const rad = (g) => (g * Math.PI) / 180;
const onda = (p) => (1 - Math.cos(p * Math.PI * 2)) / 2; // 0 → 1 → 0 num ciclo
const pt = (x, y, v = 0.98) => ({ x, y, v });

// Direção de um braço: 0 = para baixo, 90 = para o lado de fora, 180 = para cima.
function direcao(lado, graus) {
  return { x: lado * Math.sin(rad(graus)), y: -Math.cos(rad(graus)) };
}

function rosto(c, nariz, lado = 0) {
  c[0] = nariz;
  const v = nariz.v;
  c[1] = pt(nariz.x - 0.03, nariz.y + 0.05, v);
  c[2] = pt(nariz.x - 0.06, nariz.y + 0.05, v);
  c[3] = pt(nariz.x - 0.09, nariz.y + 0.05, v);
  c[4] = pt(nariz.x + 0.03, nariz.y + 0.05, v);
  c[5] = pt(nariz.x + 0.06, nariz.y + 0.05, v);
  c[6] = pt(nariz.x + 0.09, nariz.y + 0.05, v);
  c[7] = pt(nariz.x - 0.13 + lado * 0.1, nariz.y + 0.02, v);
  c[8] = pt(nariz.x + 0.13 + lado * 0.1, nariz.y + 0.02, v);
  c[9] = pt(nariz.x - 0.03, nariz.y - 0.06, v);
  c[10] = pt(nariz.x + 0.03, nariz.y - 0.06, v);
}

function mao(c, i, pulso, cotovelo) {
  const dx = pulso.x - cotovelo.x;
  const dy = pulso.y - cotovelo.y;
  const n = Math.hypot(dx, dy) || 1;
  const ux = dx / n;
  const uy = dy / n;
  // 17/18 mindinho, 19/20 indicador, 21/22 polegar
  c[17 + i] = pt(pulso.x + ux * 0.12 - uy * 0.03, pulso.y + uy * 0.12 + ux * 0.03, pulso.v);
  c[19 + i] = pt(pulso.x + ux * 0.14, pulso.y + uy * 0.14, pulso.v);
  c[21 + i] = pt(pulso.x + ux * 0.08 + uy * 0.03, pulso.y + uy * 0.08 - ux * 0.03, pulso.v);
}

function pe(c, i, tornozelo, frente) {
  c[29 + i] = pt(tornozelo.x - frente * 0.06, tornozelo.y - 0.05, tornozelo.v);
  c[31 + i] = pt(tornozelo.x + frente * 0.12, tornozelo.y - 0.07, tornozelo.v);
}

/**
 * De frente para a câmera.
 * o: { x, pulo (altura do corpo no ar), queda (fração da perna que o quadril desce),
 *      inclinar (graus), bracoE/bracoD: { a, dobra } em graus, abrir (pés afastados, em T),
 *      joelhoE/joelhoD (0..1: a coxa sobe até a horizontal),
 *      abrirE/abrirD (um pé afastado, em T), peE/peD (altura de um pé acima do chão, em T) }
 */
export function emPe(o = {}) {
  const c = new Array(33);
  const x = o.x || 0;
  const pulo = o.pulo || 0;
  const queda = o.queda || 0;
  const qy = ALTURA_QUADRIL - queda * (COXA + CANELA) + pulo;
  const incl = rad(o.inclinar || 0);
  const ux = Math.sin(incl);
  const uy = Math.cos(incl);
  const quadril = { x, y: qy };
  const ombro = { x: x + ux, y: qy + uy };
  c[11] = pt(ombro.x - OMBRO, ombro.y);
  c[12] = pt(ombro.x + OMBRO, ombro.y);
  rosto(c, pt(ombro.x + ux * PESCOCO, ombro.y + uy * PESCOCO));
  // braços
  [[-1, o.bracoE || { a: 8 }], [1, o.bracoD || { a: 8 }]].forEach(([lado, b], k) => {
    const s = c[11 + k];
    const d1 = direcao(lado, b.a);
    const cot = pt(s.x + d1.x * BRACO, s.y + d1.y * BRACO);
    const d2 = direcao(lado, b.a + (b.dobra || 0));
    const pul = pt(cot.x + d2.x * ANTEBRACO, cot.y + d2.y * ANTEBRACO);
    c[13 + k] = cot;
    c[15 + k] = pul;
    mao(c, k, pul, cot);
  });
  // pernas
  const abrir = o.abrir || 0;
  [[-1, o.joelhoE || 0], [1, o.joelhoD || 0]].forEach(([lado, sobe], k) => {
    const h = pt(x + lado * QUADRIL, qy);
    c[23 + k] = h;
    let joelho;
    let tornozelo;
    if (sobe > 0) {
      // a coxa gira para a frente: de frente, o joelho sobe e a canela fica pendurada
      const th = rad(sobe * 90);
      joelho = pt(h.x + lado * 0.03, qy - COXA * Math.cos(th));
      tornozelo = pt(joelho.x, Math.max(TORNOZELO + pulo, joelho.y - CANELA));
    } else {
      // pés no chão (ou no ar, no pulo); no agachamento a canela inclina para a frente
      const ax = x + lado * (0.2 + abrir + ((lado < 0 ? o.abrirE : o.abrirD) || 0));
      const ay = TORNOZELO + pulo + ((lado < 0 ? o.peE : o.peD) || 0);
      const fi = rad((queda / 0.45) * 38);
      const jy = Math.min(ay + CANELA * Math.cos(fi), qy - 0.05);
      joelho = pt(ax + lado * (queda * 0.25) + (h.x - ax) * 0.35, jy);
      tornozelo = pt(ax, ay);
    }
    c[25 + k] = joelho;
    c[27 + k] = tornozelo;
    pe(c, k, tornozelo, 0);
  });
  return c;
}

/**
 * Deitado de lado para a câmera, com a cabeça para a esquerda da tela.
 * o: { tipo: 'flexao' | 'prancha' | 'abdominal' | 'ponte', x, k (0..1: posição no movimento) }
 */
export function deLado(o = {}) {
  const c = new Array(33);
  const x = o.x || 0;
  const k = o.k || 0;
  const longe = 0.75; // visibilidade dos pontos do lado de lá do corpo
  const par = (i, p) => {
    // o lado de lá fica quase no mesmo lugar, um pouco atrás
    c[i] = pt(p.x + 0.02, p.y + 0.01, longe);
    c[i + 1] = pt(p.x, p.y, 0.97);
  };
  if (o.tipo === 'abdominal') {
    const th = rad(4 + 66 * k);
    const quadril = pt(x + 0.3, 0.15);
    const ombro = pt(quadril.x - Math.cos(th), quadril.y + Math.sin(th));
    par(11, ombro);
    par(23, quadril);
    par(25, pt(quadril.x + 0.62, 0.66));
    par(27, pt(quadril.x + 1.25, TORNOZELO));
    // braços cruzados no peito
    const peito = pt(ombro.x + (quadril.x - ombro.x) * 0.3 + 0.1 * Math.sin(th), ombro.y + (quadril.y - ombro.y) * 0.3 + 0.12);
    par(13, pt((ombro.x + peito.x) / 2 + 0.15, (ombro.y + peito.y) / 2 + 0.12));
    par(15, peito);
    rosto(c, pt(ombro.x - Math.cos(th) * PESCOCO, ombro.y + Math.sin(th) * PESCOCO), -1);
  } else if (o.tipo === 'ponte') {
    // de costas no chão, joelhos dobrados e pés no chão: o quadril sobe
    const ombro = pt(x - 0.9, 0.12);
    const sobe = 0.02 + 0.45 * k;
    const quadril = pt(ombro.x + Math.sqrt(1 - sobe ** 2), ombro.y + sobe);
    par(11, ombro);
    par(23, quadril);
    par(25, pt(quadril.x + 0.75, 0.72));
    par(27, pt(quadril.x + 0.95, TORNOZELO));
    par(13, pt(ombro.x + 0.55, 0.06));
    par(15, pt(ombro.x + 1.05, 0.05));
    rosto(c, pt(ombro.x - PESCOCO, ombro.y + 0.08), -1);
  } else {
    const prancha = o.tipo === 'prancha';
    // altura do ombro acima do chão: braço esticado no alto, cotovelo dobrado embaixo
    const h = prancha ? 0.6 : 1.15 - 0.68 * k;
    const ombro = pt(x - 1.2, h);
    const pe0 = pt(ombro.x + Math.sqrt(Math.max(0.1, 2.75 ** 2 - (h - TORNOZELO) ** 2)), TORNOZELO);
    const ao = (f) => pt(ombro.x + (pe0.x - ombro.x) * f, ombro.y + (pe0.y - ombro.y) * f);
    par(11, ombro);
    par(23, ao(1 / 2.75));
    par(25, ao(1.9 / 2.75));
    par(27, pe0);
    if (prancha) {
      par(13, pt(ombro.x, 0.08));
      par(15, pt(ombro.x - 0.5, 0.06));
    } else {
      const pulso = pt(ombro.x, 0.05);
      const d = ombro.y - pulso.y;
      const meioBraco = Math.sqrt(Math.max(0, ((BRACO + ANTEBRACO) / 2) ** 2 - (d / 2) ** 2));
      par(13, pt(ombro.x + meioBraco, (ombro.y + pulso.y) / 2));
      par(15, pulso);
    }
    rosto(c, pt(ombro.x - PESCOCO, ombro.y + 0.06), -1);
  }
  for (const i of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) c[i].v = 0.9;
  mao(c, 0, c[15], c[13]);
  mao(c, 1, c[16], c[14]);
  pe(c, 0, c[27], 1);
  pe(c, 1, c[28], 1);
  return c;
}

// Converte o boneco em pontos da câmera. `centro` = x do corpo na tela (0..1), espelhado como o jogo.
export function paraCamera(corpo, { centro = 0.5, escala = 0.15, chao = 0.93, aspecto = 16 / 9 } = {}) {
  return corpo.map((p) => ({
    x: 1 - (centro * aspecto + p.x * escala) / aspecto,
    y: chao - p.y * escala,
    z: 0,
    visibility: p.v,
  }));
}

// ---------------------------------------------------------------------------
// Animação de cada exercício: p = fase do ciclo (0..1), uma repetição por ciclo.

export const ANIMACOES = {
  parado: (p) => emPe({ pulo: 0, bracoE: { a: 8 + Math.sin(p * 6.28) * 2 }, bracoD: { a: 8 - Math.sin(p * 6.28) * 2 } }),
  agachamento: (p) => {
    const k = onda(p);
    return emPe({ queda: 0.36 * k, bracoE: { a: 15 + 60 * k }, bracoD: { a: 15 + 60 * k } });
  },
  pulo: (p) => {
    // agacha um pouco, sobe, cai e amortece
    let queda = 0;
    let pulo = 0;
    if (p < 0.2) queda = 0.12 * Math.sin((p / 0.2) * Math.PI * 0.5);
    else if (p < 0.65) pulo = 0.75 * Math.sin(((p - 0.2) / 0.45) * Math.PI);
    else if (p < 0.85) queda = 0.12 * Math.sin(((p - 0.65) / 0.2) * Math.PI);
    const braco = pulo > 0 ? 40 + pulo * 180 : 20 - queda * 50;
    return emPe({ queda, pulo, bracoE: { a: braco }, bracoD: { a: braco } });
  },
  polichinelo: (p) => {
    const k = onda(p);
    return emPe({ pulo: 0.16 * Math.sin(k * Math.PI), abrir: 0.42 * k, bracoE: { a: 12 + 160 * k }, bracoD: { a: 12 + 160 * k } });
  },
  corrida: (p) => {
    const s = Math.sin(p * Math.PI * 2);
    return emPe({
      pulo: 0.04 * Math.abs(s),
      joelhoE: Math.max(0, s) * 0.42,
      joelhoD: Math.max(0, -s) * 0.42,
      bracoE: { a: 20 + 25 * s, dobra: 70 },
      bracoD: { a: 20 - 25 * s, dobra: 70 },
    });
  },
  joelhoAlto: (p) => {
    const s = Math.sin(p * Math.PI * 2);
    return emPe({
      pulo: 0.05 * Math.abs(s),
      joelhoE: Math.max(0, s) * 0.95,
      joelhoD: Math.max(0, -s) * 0.95,
      bracoE: { a: 30 + 30 * s, dobra: 80 },
      bracoD: { a: 30 - 30 * s, dobra: 80 },
    });
  },
  socoAlto: (p) => {
    const s = Math.sin(p * Math.PI * 2);
    const sobe = (v) => 20 + 158 * Math.max(0, v);
    return emPe({ queda: 0.04, bracoE: { a: sobe(s), dobra: s > 0.3 ? 0 : 110 }, bracoD: { a: sobe(-s), dobra: -s > 0.3 ? 0 : 110 } });
  },
  flexao: (p) => deLado({ tipo: 'flexao', k: onda(p) }),
  abdominal: (p) => deLado({ tipo: 'abdominal', k: onda(p) }),
  prancha: (p) => deLado({ tipo: 'prancha', k: Math.sin(p * 6.28) * 0.02 }),
  cadeirinha: (p) => emPe({ queda: 0.27 + Math.sin(p * 6.28) * 0.01, bracoE: { a: 80 }, bracoD: { a: 80 } }),
  flamingo: (p) => emPe({ joelhoD: 0.62, inclinar: Math.sin(p * 6.28) * 2, bracoE: { a: 90 + Math.sin(p * 6.28) * 6 }, bracoD: { a: 90 - Math.sin(p * 6.28) * 6 } }),
  saltoLateral: (p) => {
    // um pulo para cada lado em cada ciclo
    // a primeira metade do pulo leva o corpo de um lado ao outro; na segunda, ele fica parado
    const f = (p % 0.5) / 0.5;
    const ida = p < 0.5 ? 1 : -1;
    const t = Math.min(1, f * 2);
    const pos = ida * (-0.5 + t);
    return emPe({ x: pos, pulo: 0.22 * Math.sin(t * Math.PI), inclinar: -pos * 8, bracoE: { a: 30, dobra: 60 }, bracoD: { a: 30, dobra: 60 } });
  },
  agachamentoParcial: (p) => {
    const k = onda(p);
    return emPe({ queda: 0.24 * k, bracoE: { a: 15 + 60 * k }, bracoD: { a: 15 + 60 * k } });
  },
  sentarLevantar: (p) => {
    const k = onda(p);
    return emPe({ queda: 0.42 * k, bracoE: { a: 20, dobra: 120 }, bracoD: { a: 20, dobra: 120 } });
  },
  marcha: (p) => {
    const s = Math.sin(p * Math.PI * 2);
    return emPe({
      joelhoE: Math.max(0, s) * 0.6,
      joelhoD: Math.max(0, -s) * 0.6,
      bracoE: { a: 20 - 30 * s, dobra: 70 },
      bracoD: { a: 20 + 30 * s, dobra: 70 },
    });
  },
  // polichinelo sem pulo: uma perna abre de cada vez e os braços sobem
  polichineloPasso: (p) => {
    const k = onda((p * 2) % 1);
    const esquerda = p < 0.5;
    return emPe({ abrirE: esquerda ? 0.5 * k : 0, abrirD: esquerda ? 0 : 0.5 * k, bracoE: { a: 12 + 160 * k }, bracoD: { a: 12 + 160 * k } });
  },
  panturrilha: (p) => {
    // sobe, fica um instante no alto e desce
    const k = Math.min(1, onda(p) * 1.6);
    return emPe({ pulo: 0.11 * k, bracoE: { a: 25, dobra: 60 }, bracoD: { a: 25, dobra: 60 } });
  },
  abducao: (p) => {
    const k = onda((p * 2) % 1);
    const esquerda = p < 0.5;
    return emPe({
      abrirE: esquerda ? 0.7 * k : 0,
      peE: esquerda ? 0.25 * k : 0,
      abrirD: esquerda ? 0 : 0.7 * k,
      peD: esquerda ? 0 : 0.25 * k,
      inclinar: (esquerda ? 4 : -4) * k,
      bracoE: { a: 25, dobra: 60 },
      bracoD: { a: 25, dobra: 60 },
    });
  },
  // de frente, o pé de trás aparece mais alto na imagem
  afundo: (p) => {
    const k = onda(p);
    return emPe({ queda: 0.24 * k, peD: 0.1 + 0.25 * k, bracoE: { a: 20, dobra: 110 }, bracoD: { a: 20, dobra: 110 } });
  },
  ponte: (p) => deLado({ tipo: 'ponte', k: onda(p) }),
  alongarPanturrilha: (p) => emPe({ queda: 0.06, peD: 0.12, inclinar: 3 + Math.sin(p * 6.28), bracoE: { a: 60, dobra: 40 }, bracoD: { a: 60, dobra: 40 } }),
  alongarCoxa: (p) => emPe({ queda: 0.1, inclinar: 22 + Math.sin(p * 6.28) * 2, abrirE: 0.25, bracoE: { a: 5 }, bracoD: { a: 5 } }),
  respirar: (p) => {
    const k = onda(p);
    return emPe({ bracoE: { a: 10 + 165 * k }, bracoD: { a: 10 + 165 * k } });
  },
  bracos: () => emPe({ bracoE: { a: 165 }, bracoD: { a: 165 }, abrir: 0.35 }),
  vitoria: (p) => {
    const k = onda(p);
    return emPe({ pulo: 0.3 * Math.sin(k * Math.PI), bracoE: { a: 150 + 20 * k }, bracoD: { a: 150 + 20 * k } });
  },
};

// Boneco de uma pose pedida na dança. alvo: o mesmo formato de compararPose (js/motor/corpo.js).
export function poseDoAlvo(alvo) {
  return emPe({
    bracoE: { a: alvo.bracoE ?? 10 },
    bracoD: { a: alvo.bracoD ?? 10 },
    abrir: alvo.pernas === 'abertas' ? 0.35 : 0,
    queda: alvo.agachado ? 0.16 : 0,
    joelhoE: alvo.pe === -1 || alvo.pe === 2 ? 0.7 : 0,
    joelhoD: alvo.pe === 1 ? 0.7 : 0,
  });
}
