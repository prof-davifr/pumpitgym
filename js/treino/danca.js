// Dança: uma sequência de poses no tempo da música. A pessoa imita a pose; a nota vem de
// compararPose (js/motor/corpo.js). Todos os passos são de baixo impacto: sem pulo e sem giro.
//
// Pose: { nome, bracoE, bracoD (graus: 0 = para baixo, 90 = para o lado, 180 = para cima),
//         pernas: 'juntas'|'abertas', agachado, pe (2 = um joelho no alto) }
// bracoE é o braço que aparece à esquerda da tela (a tela é um espelho).

const P = {
  v: { nome: 'V', bracoE: 140, bracoD: 140, pernas: 'abertas' },
  cruz: { nome: 'CRUZ', bracoE: 90, bracoD: 90, pernas: 'juntas' },
  discoD: { nome: 'DISCO', bracoE: 20, bracoD: 140, pernas: 'abertas' },
  discoE: { nome: 'DISCO', bracoE: 140, bracoD: 20, pernas: 'abertas' },
  alto: { nome: 'ALTO', bracoE: 175, bracoD: 175, pernas: 'juntas' },
  ondaD: { nome: 'ONDA', bracoE: 90, bracoD: 170, pernas: 'juntas' },
  ondaE: { nome: 'ONDA', bracoE: 170, bracoD: 90, pernas: 'juntas' },
  baixo: { nome: 'DESCE', bracoE: 90, bracoD: 90, pernas: 'abertas', agachado: true },
  joelho: { nome: 'JOELHO', bracoE: 150, bracoD: 150, pe: 2 },
  solto: { nome: 'SOLTA', bracoE: 15, bracoD: 15, pernas: 'juntas' },
  robo: { nome: 'ROBÔ', bracoE: 90, bracoD: 15, pernas: 'abertas' },
  roboD: { nome: 'ROBÔ', bracoE: 15, bracoD: 90, pernas: 'abertas' },
};

// Frases de 8 poses. Cada pose dura 2 tempos da música.
const FRASES = [
  ['cruz', 'solto', 'cruz', 'alto', 'cruz', 'solto', 'v', 'solto'],
  ['discoD', 'solto', 'discoE', 'solto', 'discoD', 'discoE', 'v', 'solto'],
  ['ondaD', 'ondaE', 'ondaD', 'ondaE', 'alto', 'cruz', 'baixo', 'solto'],
  ['joelho', 'solto', 'joelho', 'solto', 'robo', 'roboD', 'robo', 'alto'],
  ['v', 'baixo', 'v', 'baixo', 'cruz', 'alto', 'cruz', 'solto'],
];

export const TEMPOS_POR_POSE = 2;

/** Coreografia para `tempos` tempos de música: [{ tempo, pose }]. O primeiro compasso é de espera. */
export function coreografia(tempos, semente = 0) {
  const passos = [];
  let f = semente;
  for (let tempo = 8; tempo + TEMPOS_POR_POSE <= tempos; ) {
    const frase = FRASES[f % FRASES.length];
    for (const nome of frase) {
      if (tempo + TEMPOS_POR_POSE > tempos) break;
      passos.push({ tempo, pose: P[nome] });
      tempo += TEMPOS_POR_POSE;
    }
    f++;
  }
  return passos;
}

// Nota de uma pose: a melhor semelhança (0..1) perto do tempo certo.
export function notaDaPose(semelhanca) {
  if (semelhanca >= 0.8) return { texto: 'ÓTIMO', pontos: 100 };
  if (semelhanca >= 0.55) return { texto: 'BOM', pontos: 60 };
  if (semelhanca >= 0.35) return { texto: 'QUASE', pontos: 20 };
  return { texto: '', pontos: 0 };
}
