// Monta as sessões: uma lista de blocos, e em cada bloco o exercício de cada pessoa.
//
// O treino do dia segue a estrutura recomendada pelo ACSM (Garber et al., Med Sci Sports Exerc 2011):
// aquecimento, parte principal (força de pernas e aeróbico em intervalos), e volta à calma.
import { EXERCICIOS } from './exercicios.js';
import { permitido } from './perfis.js';

// Cada estação tem as opções em ordem de preferência: vale a primeira que o perfil permite.
// As listas com mais de uma opção de impacto mudam com o dia.
const ESTACOES = [
  { opcoes: [['agachamento'], ['agachamentoParcial']], regra: 'parcial' },
  { opcoes: [['polichinelo', 'corrida'], ['polichineloPasso', 'marcha']] },
  { opcoes: [['afundo'], ['abducao']] },
  { opcoes: [['agachamentoSalto', 'saltoLateral'], ['panturrilha']] },
  { opcoes: [['cadeirinha']] },
];

function escolher(estacao, perfil, dia) {
  // quem tem limite de profundidade faz o agachamento parcial
  if (estacao.regra === 'parcial' && perfil.restricoes && perfil.restricoes.profundidadeMax) return 'agachamentoParcial';
  for (const grupo of estacao.opcoes) {
    const id = grupo[dia % grupo.length];
    if (permitido(EXERCICIOS[id], perfil)) return id;
    const outro = grupo.find((k) => permitido(EXERCICIOS[k], perfil));
    if (outro) return outro;
  }
  return 'marcha';
}

const bloco = (tipo, segundos, ids, extra = {}) => ({ tipo, segundos, exercicios: ids, ...extra });
const todos = (perfis, id) => perfis.map(() => id);

// Número do dia (muda à meia-noite do aparelho).
export function diaDe(data = new Date()) {
  return Math.floor((data.getTime() - data.getTimezoneOffset() * 60000) / 86400000);
}

/**
 * @param {Array} perfis as pessoas que vão treinar (1 ou 2)
 * @param {object} o { voltas, chao, dia }
 */
export function treinoDoDia(perfis, o = {}) {
  const voltas = o.voltas || 2;
  const dia = o.dia ?? diaDe();
  const blocos = [];
  blocos.push(bloco('exercicio', 60, todos(perfis, 'marcha'), { fase: 'AQUECIMENTO' }));
  blocos.push(bloco('exercicio', 60, todos(perfis, 'polichineloPasso'), { fase: 'AQUECIMENTO' }));
  for (let v = 0; v < voltas; v++) {
    ESTACOES.forEach((estacao, i) => {
      const ids = perfis.map((p) => escolher(estacao, p, dia + v));
      const parado = ids.every((id) => EXERCICIOS[id].tipo === 'segurar');
      blocos.push(bloco('exercicio', parado ? 30 : 40, ids, { fase: `VOLTA ${v + 1} DE ${voltas}`, estacao: i + 1 }));
    });
    if (o.chao) blocos.push(bloco('exercicio', 40, todos(perfis, 'ponte'), { fase: `VOLTA ${v + 1} DE ${voltas}` }));
  }
  blocos.push(bloco('danca', 90, todos(perfis, 'danca'), { fase: 'DANÇA' }));
  for (const id of ['alongarPanturrilha', 'alongarCoxa', 'respirar']) {
    blocos.push(bloco('exercicio', 30, todos(perfis, id), { fase: 'VOLTA À CALMA' }));
  }
  return { id: 'treino', nome: 'TREINO DO DIA', descanso: 20, blocos };
}

export function sessaoDeDanca(perfis, segundos = 180) {
  return {
    id: 'danca', nome: 'DANÇA', descanso: 15,
    blocos: [
      bloco('exercicio', 45, todos(perfis, 'marcha'), { fase: 'AQUECIMENTO' }),
      bloco('danca', segundos, todos(perfis, 'danca'), { fase: 'DANÇA' }),
      bloco('exercicio', 30, todos(perfis, 'respirar'), { fase: 'VOLTA À CALMA' }),
    ],
  };
}

// Desafio: o máximo de agachamentos em 60 s (parcial para quem tem limite de profundidade).
export function desafioDasPernas(perfis) {
  const ids = perfis.map((p) => (p.restricoes && p.restricoes.profundidadeMax ? 'agachamentoParcial' : 'agachamento'));
  return { id: 'desafio', nome: 'DESAFIO DAS PERNAS', descanso: 10, recorde: true, blocos: [bloco('exercicio', 60, ids, { fase: '60 SEGUNDOS' })] };
}

// Teste de sentar e levantar em 30 s (Rikli & Jones, 1999).
export function testeDe30s(perfis) {
  return { id: 'teste30', nome: 'TESTE DE 30 SEGUNDOS', descanso: 10, recorde: true, blocos: [bloco('exercicio', 30, todos(perfis, 'sentarLevantar'), { fase: 'SENTAR E LEVANTAR' })] };
}

export function duracaoDoPlano(plano) {
  return plano.blocos.reduce((s, b) => s + b.segundos, 0) + plano.descanso * (plano.blocos.length - 1);
}
