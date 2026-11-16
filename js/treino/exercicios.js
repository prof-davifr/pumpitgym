// Catálogo dos exercícios. Todos usam só o peso do corpo.
//
// contador: nome do contador do LeitorCorpo (js/motor/corpo.js). tipo 'rep' conta repetições;
//   'segurar' conta segundos na posição; 'livre' só marca o tempo (alongamento).
// met: equivalente metabólico da categoria do exercício no Compêndio de Atividades Físicas
//   (Ainsworth et al., Med Sci Sports Exerc 2011). É a categoria mais próxima, não uma medida do exercício.
// impacto: os dois pés saem do chão. flexaoProfunda: o joelho passa de 90° com carga. giro: o pé gira com carga.
// chao: deitado, de lado para a câmera.

export const MET_REPOUSO = 1.3; // em pé, parado (código 07040)

export const EXERCICIOS = {
  agachamento: {
    nome: 'AGACHAMENTO', contador: 'agachamento', tipo: 'rep', met: 5.0, anim: 'agachamento', ciclo: 2.6,
    dica: 'PÉS NA LARGURA DOS OMBROS. QUADRIL PARA TRÁS.', quase: 'DESÇA MAIS',
    base: 'Treino de força com o peso do corpo (código 02052). Fortalece quadríceps e glúteos.',
  },
  agachamentoParcial: {
    nome: 'AGACHAMENTO PARCIAL', contador: 'agachamento', tipo: 'rep', met: 5.0, anim: 'agachamentoParcial', ciclo: 4.0,
    dica: 'DESÇA DEVAGAR, SÓ ATÉ A METADE. JOELHOS NA DIREÇÃO DOS PÉS.', quase: 'DESÇA UM POUCO MAIS',
    base: 'Agachamento até cerca de 90° de joelho: fortalece o quadríceps com menos carga no joelho.',
  },
  cadeirinha: {
    nome: 'AGACHAMENTO PARADO', contador: 'cadeirinha', tipo: 'segurar', met: 3.8, anim: 'cadeirinha', ciclo: 3,
    dica: 'DESÇA UM POUCO E FIQUE PARADO.', quase: 'DESÇA UM POUCO',
    base: 'Isometria de quadríceps (calistenia moderada, código 02022).',
  },
  afundo: {
    nome: 'AFUNDO', contador: 'afundo', tipo: 'rep', met: 3.8, anim: 'afundo', ciclo: 2.8, flexaoProfunda: true,
    dica: 'UM PÉ ATRÁS. DESÇA RETO E SUBA. TROQUE A PERNA NA METADE.', quase: 'DESÇA MAIS',
    base: 'Calistenia moderada (código 02022). Fortalece quadríceps, glúteos e equilíbrio.',
  },
  panturrilha: {
    nome: 'PONTA DOS PÉS', contador: 'panturrilha', tipo: 'rep', met: 2.8, anim: 'panturrilha', ciclo: 2.2, baseFirme: true,
    dica: 'SUBA NA PONTA DOS PÉS, PARE UM INSTANTE E DESÇA DEVAGAR.', quase: 'SUBA MAIS',
    base: 'Calistenia leve (código 02024). Fortalece a panturrilha e ajuda a estabilizar o joelho.',
  },
  abducao: {
    nome: 'PERNA PARA O LADO', contador: 'abducao', tipo: 'rep', met: 2.8, anim: 'abducao', ciclo: 3.2,
    dica: 'ABRA UMA PERNA ESTICADA PARA O LADO E VOLTE. TRONCO RETO.', quase: 'ABRA MAIS A PERNA',
    base: 'Calistenia leve (código 02024). Fortalece o glúteo médio, que alinha o joelho.',
  },
  ponte: {
    nome: 'PONTE', contador: 'ponte', tipo: 'rep', met: 2.8, anim: 'ponte', ciclo: 3, chao: true,
    dica: 'DEITE DE COSTAS, DE LADO PARA A CÂMERA. SUBA O QUADRIL.', quase: 'SUBA MAIS O QUADRIL',
    base: 'Calistenia leve (código 02024). Fortalece glúteos e posteriores da coxa sem carga no joelho.',
  },
  marcha: {
    nome: 'MARCHA', contador: 'corrida', tipo: 'rep', met: 3.8, anim: 'marcha', ciclo: 1.1,
    dica: 'MARCHE NO LUGAR. SUBA OS JOELHOS E BALANCE OS BRAÇOS.', quase: 'JOELHO MAIS ALTO',
    base: 'Aeróbico de baixo impacto: um pé fica sempre no chão.',
  },
  polichineloPasso: {
    nome: 'POLICHINELO SEM PULO', contador: 'polichinelo', tipo: 'rep', met: 5.0, anim: 'polichineloPasso', ciclo: 2.4,
    dica: 'ABRA UMA PERNA DE CADA VEZ E SUBA OS BRAÇOS. SEM PULAR.', quase: 'BRAÇOS MAIS ALTO',
    base: 'Aeróbica de baixo impacto (código 03020).',
  },
  polichinelo: {
    nome: 'POLICHINELO', contador: 'polichinelo', tipo: 'rep', met: 8.0, anim: 'polichinelo', ciclo: 1.2, impacto: true,
    dica: 'ABRA PERNAS E BRAÇOS NO PULO.', quase: 'BRAÇOS MAIS ALTO',
    base: 'Calistenia vigorosa (código 02020).',
  },
  corrida: {
    nome: 'CORRIDA NO LUGAR', contador: 'corrida', tipo: 'rep', met: 8.0, anim: 'corrida', ciclo: 0.6, impacto: true,
    dica: 'CORRA NO LUGAR.', quase: 'PÉS MAIS ALTO',
    base: 'Corrida no lugar (código 12020).',
  },
  agachamentoSalto: {
    nome: 'AGACHAMENTO COM SALTO', contador: 'pulo', tipo: 'rep', met: 8.0, anim: 'pulo', ciclo: 1.6, impacto: true, flexaoProfunda: true,
    dica: 'AGACHE, SALTE E CAIA MACIO.', quase: 'PULE MAIS ALTO',
    base: 'Calistenia vigorosa (código 02020). Treina potência das pernas.',
  },
  saltoLateral: {
    nome: 'SALTO LATERAL', contador: 'saltoLateral', tipo: 'rep', met: 8.0, anim: 'saltoLateral', ciclo: 1.6, impacto: true, giro: true,
    dica: 'SALTE DE UM LADO PARA O OUTRO.', quase: 'PULE MAIS LONGE',
    base: 'Calistenia vigorosa (código 02020).',
  },
  sentarLevantar: {
    nome: 'SENTAR E LEVANTAR', contador: 'agachamento', tipo: 'rep', met: 3.8, anim: 'sentarLevantar', ciclo: 2.4, semLimite: true,
    dica: 'CADEIRA FIRME, BRAÇOS CRUZADOS. SENTE E LEVANTE POR COMPLETO.', quase: 'SENTE POR COMPLETO',
    base: 'Teste de sentar e levantar em 30 s (Rikli & Jones, 1999): mede a força das pernas.',
  },
  danca: {
    nome: 'DANÇA', tipo: 'danca', met: 5.0, anim: 'respirar', ciclo: 2,
    dica: 'IMITE A POSE NO TEMPO DA MÚSICA.',
    base: 'Dança aeróbica de baixo impacto (código 03020).',
  },
  alongarPanturrilha: {
    nome: 'ALONGAR A PANTURRILHA', tipo: 'livre', met: 2.3, anim: 'alongarPanturrilha', ciclo: 4,
    dica: 'UM PÉ ATRÁS, CALCANHAR NO CHÃO. TROQUE NA METADE.',
    base: 'Alongamento leve (código 02101).',
  },
  alongarCoxa: {
    nome: 'ALONGAR ATRÁS DA COXA', tipo: 'livre', met: 2.3, anim: 'alongarCoxa', ciclo: 4,
    dica: 'UMA PERNA ESTICADA À FRENTE. INCLINE O TRONCO RETO. TROQUE NA METADE.',
    base: 'Alongamento leve (código 02101).',
  },
  respirar: {
    nome: 'RESPIRAR', tipo: 'livre', met: 2.3, anim: 'respirar', ciclo: 6,
    dica: 'SUBA OS BRAÇOS E PUXE O AR. DESÇA E SOLTE.',
    base: 'Volta à calma.',
  },
};

// Calorias gastas (kcal) num intervalo: fórmula do ACSM, kcal/min = MET × 3,5 × peso (kg) / 200.
export function calorias(met, pesoKg, segundos) {
  return ((met * 3.5 * pesoKg) / 200) * (segundos / 60);
}
