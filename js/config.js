// Constantes gerais. A tela tem 1280×720 unidades lógicas, desenhadas na resolução real do aparelho.

export const LARGURA = 1280;
export const ALTURA = 720;

export const CORES = {
  fundo: '#12052b',
  rosa: '#ff2bd6',
  ciano: '#21f6ff',
  amarelo: '#ffe14a',
  laranja: '#ff8a3c',
  roxo: '#8a4dff',
  verde: '#5dff9b',
  vermelho: '#ff4466',
  branco: '#f6f0ff',
  jogadores: ['#21f6ff', '#ff2bd6'],
};

// Limiares dos exercícios (js/motor/corpo.js). "T" = comprimento do tronco; "perna" = quadril→tornozelo
// medidos em pé na calibração. A sensibilidade multiplica os limiares de profundidade.
export const LIMIARES = {
  agachamentoDesce: 0.17,      // o quadril desce esta fração da perna (joelho perto de 60°)
  agachamentoBom: 0.3,         // profundidade de um agachamento completo (joelho perto de 90°)
  agachamentoSobe: 0.07,
  puloAltura: 0.12,            // em T
  puloVelocidade: 0.9,         // T por segundo
  puloRearme: 0.05,
  puloTempoMax: 1.2,
  polichineloSobe: 0.12,       // pulsos acima dos ombros (em T)
  polichineloDesce: 0.2,       // pulsos abaixo dos ombros
  polichineloPernas: 0.3,      // pés afastados além da base (em T)
  corridaSobe: 0.11,           // um pé ou joelho acima do outro (em T)
  corridaDesce: 0.04,
  joelhoAltoSobe: 0.25,
  socoAltoSobe: 0.08,          // pulso acima do nariz (em T)
  flexaoDesce: 0.66,
  flexaoSobe: 0.86,
  flexaoCotovelo: 110,
  abdominalSobe: 0.55,
  abdominalDesce: 0.3,
  cadeirinha: 0.13,            // fração da perna
  flamingo: 0.22,
  saltoLateral: 0.3,           // quadril para o lado (em T)
  panturrilhaSobe: 0.055,      // o corpo sobe na ponta dos pés (em T)
  panturrilhaDesce: 0.025,
  panturrilhaTempo: 0.2,       // segundos no alto para valer
  abducaoSobe: 0.55,           // tornozelo afastado do meio do quadril (em T)
  abducaoDesce: 0.4,
  afundoDesce: 0.13,           // fração da perna
  afundoSobe: 0.06,
  afundoPernas: 0.12,          // um joelho ou pé acima do outro (em T): as pernas não estão iguais
  ponteSobe: 0.22,             // quadril acima da linha ombro–chão (em T), deitado de lado para a câmera
  ponteDesce: 0.1,
  visibilidade: 0.45,
};

export const SENSIBILIDADES = { baixa: 1.3, media: 1.0, alta: 0.75 };

// Cursor da mão (js/motor/cursor-mao.js). Medidas em T a partir do meio dos ombros.
export const CURSOR = {
  largura: 1.4,      // a mão alcança de -largura a +largura
  topo: 1.1,         // acima dos ombros
  baixo: 0.55,       // abaixo dos ombros
  soltar: 0.8,       // a mão abaixo disto solta o cursor
  tempo: 1.5,        // segundos parada sobre o botão para confirmar
};

// Espaço entre duas pessoas (js/motor/espaco.js), em T entre os meios dos quadris.
export const ESPACO = { perto: 2.6, atencao: 3.0, maos: 0.3 };

// Fadiga (js/motor/fadiga.js): perda em relação às melhores repetições do bloco.
export const FADIGA = { atencao: 0.2, parar: 0.3, cadenciaAtencao: 0.3, cadenciaParar: 0.45, minimo: 5 };

const CHAVE_OPCOES = 'pumpitgym-opcoes';

const opcoesPadrao = {
  sensibilidade: 'media',
  volume: 0.7,
  voz: true,
  precisao: 'normal',  // modelo da câmera: normal (mais rápido) ou alta
  voltas: 2,           // voltas do circuito no treino do dia
  chao: false,         // inclui a ponte de glúteo (deitado de lado para a câmera)
  bpmProprio: 126,     // batidas por minuto da música escolhida pelo usuário
};

function carregarOpcoes() {
  try {
    return { ...opcoesPadrao, ...JSON.parse(localStorage.getItem(CHAVE_OPCOES) || '{}') };
  } catch {
    return { ...opcoesPadrao };
  }
}

export const opcoes = typeof localStorage !== 'undefined' ? carregarOpcoes() : { ...opcoesPadrao };

export function salvarOpcoes() {
  if (typeof localStorage !== 'undefined') localStorage.setItem(CHAVE_OPCOES, JSON.stringify(opcoes));
}

// Opinião de quem joga (js/motor/opiniao.js): o Google Forms do jogo e os nomes dos campos (entry.N).
// Sem formulário, o jogo não pergunta nada.
export const OPINIAO = {
  formulario: 'https://docs.google.com/forms/d/e/1FAIpQLScAV1Ft_U_2_29e9L85_Pgwu7QrqudSdblUW8fp8kQ7UvJ0wg/viewform',
  campos: { voto: 'entry.1295944358', dados: 'entry.209197006' },
  minutosAntes: 4, // tempo de jogo antes da primeira pergunta
};
