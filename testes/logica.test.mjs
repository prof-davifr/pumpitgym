import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rodar, DT } from './ajuda.mjs';
import { LeitorCorpo, compararPose } from '../js/motor/corpo.js';
import { ANIMACOES, emPe, paraCamera, poseDoAlvo } from '../js/motor/poses.js';
import { CursorMao } from '../js/motor/cursor-mao.js';
import { medirEspaco } from '../js/motor/espaco.js';
import { Fadiga } from '../js/motor/fadiga.js';
import { EXERCICIOS, calorias } from '../js/treino/exercicios.js';
import { PERFIS_PADRAO, permitido } from '../js/treino/perfis.js';
import { avisoDeSeguranca } from '../js/treino/seguranca.js';
import { treinoDoDia, desafioDasPernas, testeDe30s, sessaoDeDanca, duracaoDoPlano } from '../js/treino/plano.js';
import { coreografia } from '../js/treino/danca.js';
import { Sessao } from '../js/treino/sessao.js';
import { Historico } from '../js/dados/historico.js';

const [animo, foco, forca] = PERFIS_PADRAO;

// Lê uma pose parada e devolve o leitor (com q, ombro, quadril e tronco).
function ler(corpo, camera = {}) {
  const L = new LeitorCorpo();
  let t = 0;
  for (let i = 0; i < 40; i++, t += DT) L.atualizar(paraCamera(emPe(), camera), t);
  for (let i = 0; i < 30; i++, t += DT) L.atualizar(paraCamera(corpo, camera), t);
  return { L, t };
}

// ---- cursor da mão

test('cursor: a mão abaixada não liga o cursor; a mão levantada liga', () => {
  const c = new CursorMao();
  let { L, t } = ler(emPe());
  c.atualizar(L.q, L.ombro, L.base.tronco, t);
  assert.equal(c.ativo, false);
  ({ L, t } = ler(emPe({ bracoD: { a: 90 } })));
  c.atualizar(L.q, L.ombro, L.base.tronco, t);
  assert.equal(c.ativo, true);
  assert.equal(c.mao, 'D');
  assert.ok(c.x > 0.75, `x ${c.x}`); // braço da direita da tela aberto: cursor à direita
});

test('cursor: a mão acima da cabeça leva o cursor para o alto da tela', () => {
  const c = new CursorMao();
  const { L, t } = ler(emPe({ bracoE: { a: 170 } }));
  c.atualizar(L.q, L.ombro, L.base.tronco, t);
  assert.ok(c.ativo && c.y < 0.1 && c.x < 0.5, `x ${c.x} y ${c.y}`);
});

test('cursor: confirma depois do tempo parado no botão, e só uma vez', () => {
  const c = new CursorMao();
  c.ativo = true;
  c.x = 0.5;
  c.y = 0.5;
  const botoes = [{ x: 500, y: 300, l: 280, a: 120 }];
  assert.equal(c.escolher(botoes, 1280, 720, 0), null);
  assert.equal(c.escolher(botoes, 1280, 720, 1.0), null);
  assert.ok(c.progresso > 0.6);
  assert.equal(c.escolher(botoes, 1280, 720, 1.6), botoes[0]);
  assert.equal(c.escolher(botoes, 1280, 720, 4), null);
  c.x = 0.1; // sai do botão: a espera recomeça
  c.escolher(botoes, 1280, 720, 5);
  c.x = 0.5;
  c.escolher(botoes, 1280, 720, 5.1);
  assert.equal(c.escolher(botoes, 1280, 720, 6.7), botoes[0]);
});

// ---- espaço entre duas pessoas

function pessoa(centro, corpo = emPe()) {
  const { L } = ler(corpo, { centro });
  return { q: L.q, quadril: L.quadril, T: L.base.tronco };
}

test('espaço: longe está ok; perto pede para afastar', () => {
  assert.equal(medirEspaco(pessoa(0.25), pessoa(0.75)).nivel, 'ok');
  assert.equal(medirEspaco(pessoa(0.42), pessoa(0.58)).nivel, 'perto');
  assert.equal(medirEspaco(pessoa(0.25), null), null);
});

test('espaço: braços abertos quase se tocando contam como perto', () => {
  const abertos = emPe({ bracoE: { a: 90 }, bracoD: { a: 90 } });
  // os corpos estão a mais de 3 troncos, mas as mãos quase se tocam
  const r = medirEspaco(pessoa(0.371, abertos), pessoa(0.629, abertos));
  assert.ok(r.distancia > 3, `distância ${r.distancia}`);
  assert.equal(r.nivel, 'perto');
  assert.equal(medirEspaco(pessoa(0.371), pessoa(0.629)).nivel, 'ok');
});

// ---- fadiga

test('fadiga: repetições iguais não indicam fadiga', () => {
  const f = new Fadiga();
  for (let i = 0; i < 12; i++) f.registrar(i * 2, { velocidade: 0.4, amplitude: 0.3 });
  assert.equal(f.nivel, 'ok');
  assert.ok(f.indice < 0.05);
});

test('fadiga: a subida cada vez mais lenta vira atenção e depois parar', () => {
  const f = new Fadiga();
  const niveis = [];
  let t = 0;
  for (let i = 0; i < 14; i++) {
    const v = 0.5 * (1 - 0.035 * i); // perde 3,5 % por repetição
    t += 2;
    f.registrar(t, { velocidade: v, amplitude: 0.3 });
    niveis.push(f.nivel);
  }
  assert.equal(niveis[3], 'ok');
  assert.ok(niveis.includes('atencao'));
  assert.equal(niveis.at(-1), 'parar');
  assert.ok(niveis.indexOf('atencao') < niveis.indexOf('parar'));
});

test('fadiga: a queda do ritmo e da amplitude também contam', () => {
  const ritmo = new Fadiga();
  let t = 0;
  for (let i = 0; i < 12; i++) ritmo.registrar((t += 1 + i * 0.15), {});
  assert.notEqual(ritmo.nivel, 'ok');
  const amp = new Fadiga();
  for (let i = 0; i < 10; i++) amp.registrar(i * 2, { amplitude: 0.34 - i * 0.012 });
  assert.notEqual(amp.nivel, 'ok');
});

test('fadiga: o leitor mede a subida mais lenta de um agachamento mais lento', () => {
  const rapido = rodar('agachamento', { ciclo: 2 }).todas.filter((r) => r.nome === 'agachamento');
  const lento = rodar('agachamento', { ciclo: 4 }).todas.filter((r) => r.nome === 'agachamento');
  assert.ok(lento[2].velocidade < rapido[2].velocidade * 0.65);
});

// ---- calorias, perfis e segurança

test('calorias: fórmula do ACSM', () => {
  // 5 MET, 70 kg, 10 min: 5 × 3,5 × 70 / 200 × 10 = 61,25 kcal
  assert.ok(Math.abs(calorias(5, 70, 600) - 61.25) < 1e-9);
});

test('perfil Ânimo: nenhum exercício de impacto, giro ou flexão profunda', () => {
  for (const [id, ex] of Object.entries(EXERCICIOS)) {
    if (ex.impacto || ex.giro || ex.flexaoProfunda) assert.equal(permitido(ex, animo), false, id);
  }
  assert.ok(permitido(EXERCICIOS.agachamentoParcial, animo));
  assert.ok(permitido(EXERCICIOS.agachamentoSalto, foco));
});

test('treino do dia: o Ânimo nunca recebe impacto, em nenhum dia', () => {
  for (let dia = 0; dia < 14; dia++) {
    const plano = treinoDoDia([foco, animo], { dia, voltas: 3, chao: true });
    for (const b of plano.blocos) {
      const ex = EXERCICIOS[b.exercicios[1]];
      assert.ok(ex, b.exercicios[1]);
      assert.ok(permitido(ex, animo), `${b.exercicios[1]} no dia ${dia}`);
      assert.notEqual(b.exercicios[1], 'agachamento');
    }
    assert.ok(plano.blocos.some((b) => b.exercicios[1] === 'agachamentoParcial'));
    assert.ok(plano.blocos.some((b) => EXERCICIOS[b.exercicios[0]].impacto));
  }
});

test('planos: duração e exercícios', () => {
  const plano = treinoDoDia([forca], { dia: 3, voltas: 2 });
  const minutos = duracaoDoPlano(plano) / 60;
  assert.ok(minutos > 12 && minutos < 20, `${minutos} min`);
  assert.equal(desafioDasPernas([foco, animo]).blocos[0].exercicios.join(), 'agachamento,agachamentoParcial');
  assert.equal(testeDe30s([animo]).blocos[0].segundos, 30);
  assert.equal(sessaoDeDanca([foco]).blocos[1].tipo, 'danca');
});

test('segurança: DESÇA MENOS além do limite, só para quem tem limite', () => {
  const fundo = { emPe: true, profundidade: 0.34 };
  const meio = { emPe: true, profundidade: 0.25 };
  const ex = EXERCICIOS.agachamentoParcial;
  assert.equal(avisoDeSeguranca(animo, ex, fundo), 'DESÇA MENOS');
  assert.equal(avisoDeSeguranca(animo, ex, meio), null);
  assert.equal(avisoDeSeguranca(foco, EXERCICIOS.agachamento, fundo), null);
  assert.equal(avisoDeSeguranca(animo, EXERCICIOS.sentarLevantar, fundo), null);
});

test('segurança: SEM PULAR e MAIS DEVAGAR', () => {
  const m = { emPe: true, profundidade: 0 };
  assert.equal(avisoDeSeguranca(animo, EXERCICIOS.marcha, m, { pulo: { qualidade: 1 } }), 'SEM PULAR');
  assert.equal(avisoDeSeguranca(foco, EXERCICIOS.marcha, m, { pulo: { qualidade: 1 } }), null);
  assert.equal(avisoDeSeguranca(animo, EXERCICIOS.agachamentoParcial, m, { agachamento: { descida: 0.5 } }), 'MAIS DEVAGAR');
  assert.equal(avisoDeSeguranca(animo, EXERCICIOS.agachamentoParcial, m, { agachamento: { descida: 1.8 } }), null);
});

test('segurança: o agachamento completo sintético passa do limite do Ânimo e o parcial não', () => {
  const max = (anim) => {
    let m = 0;
    rodar(anim, { reps: 3, aoQuadro: (r) => r.medidas && (m = Math.max(m, r.medidas.profundidade)) });
    return m;
  };
  assert.ok(max('agachamento') > animo.restricoes.profundidadeMax);
  assert.ok(max('agachamentoParcial') < animo.restricoes.profundidadeMax);
});

// ---- dança

test('dança: cada pose do boneco recebe nota alta para o próprio alvo e baixa para outro', () => {
  const passos = coreografia(200, 0);
  assert.ok(passos.length > 80);
  assert.equal(passos[0].tempo, 8);
  const medir = (alvo) => {
    const { L } = ler(poseDoAlvo(alvo));
    return L.medidas.pose;
  };
  const poses = [...new Set(passos.map((p) => p.pose))];
  for (const alvo of poses) assert.ok(compararPose(medir(alvo), alvo) >= 0.8, `${alvo.nome}: ${compararPose(medir(alvo), alvo)}`);
  const parado = medir({});
  for (const alvo of poses.filter((p) => p.nome !== 'SOLTA')) assert.ok(compararPose(parado, alvo) < 0.55, alvo.nome);
});

// ---- sessão completa com uma pessoa sintética

function simular(plano, perfis, anims) {
  const s = new Sessao(plano, perfis, { inicio: new Date('2026-11-16T19:00:00') });
  const leitores = perfis.map(() => new LeitorCorpo());
  let t = 0;
  const sinais = [];
  // calibração
  for (let i = 0; i < 60; i++, t += DT) leitores.forEach((L, j) => L.atualizar(paraCamera(ANIMACOES.parado(0), { centro: j ? 0.72 : 0.28 }), t));
  const fase = perfis.map(() => 0);
  while (s.fase !== 'fim' && t < 3600) {
    t += DT;
    const entradas = leitores.map((L, j) => {
      let anim = 'parado';
      let ciclo = 2;
      if (s.fase === 'bloco') {
        const ex = s.exercicioDe(j);
        anim = anims[j] || ex.anim;
        ciclo = ex.ciclo;
        if (ex.tipo === 'danca') anim = null;
      }
      fase[j] = (fase[j] + DT / ciclo) % 1;
      let corpo;
      if (anim === null) {
        // dança: faz a pose do passo atual
        const passo = s.passos[s.jogadores[j].atual.passo];
        corpo = passo ? poseDoAlvo(passo.pose) : emPe();
      } else corpo = ANIMACOES[anim](fase[j]);
      L.baseFirme = s.fase === 'bloco' && !!s.exercicioDe(j).baseFirme;
      const r = L.atualizar(paraCamera(corpo, { centro: j ? 0.72 : 0.28 }), t);
      const niveis = {};
      for (const [k, c] of Object.entries(L.contadores)) niveis[k] = c.nivel;
      return { presente: r.presente, eventos: Object.entries(r.reps).map(([nome, rep]) => ({ nome, ...rep })), segurando: r.segurando, medidas: r.medidas, niveis };
    });
    sinais.push(...s.atualizar(DT, entradas));
  }
  return { s, sinais };
}

test('sessão: o treino do dia inteiro conta repetições e calorias para as duas pessoas', () => {
  const comPeso = [{ ...foco, pesoKg: 80 }, { ...animo, pesoKg: 60 }];
  const plano = treinoDoDia(comPeso, { dia: 0, voltas: 1 });
  const { s, sinais } = simular(plano, comPeso, []);
  assert.equal(s.fase, 'fim');
  const [a, b] = s.jogadores;
  assert.equal(a.blocos.length, plano.blocos.length);
  for (const jog of [a, b]) {
    for (const bl of jog.blocos) if (bl.tipo === 'rep' || bl.tipo === 'segurar' || bl.tipo === 'danca') assert.ok(bl.reps > 3, `${bl.exercicio}: ${bl.reps}`);
  }
  // o Ânimo faz o parcial e não recebe o aviso de profundidade
  assert.ok(!sinais.some((x) => x.tipo === 'aviso' && x.j === 1 && x.texto === 'DESÇA MENOS'));
  assert.ok(a.kcal > b.kcal, 'a pessoa mais pesada e com impacto gasta mais');
  assert.ok(a.kcal > 40 && a.kcal < 150, `${a.kcal} kcal`);
  assert.ok(b.pontos > 1000, `pontos da dança ${b.pontos}`);
  const reg = s.registros([5, 3]);
  assert.equal(reg.length, 2);
  assert.equal(reg[1].perfil, 'animo');
  assert.equal(reg[1].esforco, 3);
  assert.equal(reg[0].inicio, new Date('2026-11-16T19:00:00').toISOString());
});

test('sessão: o Ânimo num agachamento completo recebe DESÇA MENOS', () => {
  const { sinais } = simular(desafioDasPernas([animo]), [animo], ['agachamento']);
  assert.ok(sinais.some((x) => x.tipo === 'aviso' && x.texto === 'DESÇA MENOS'));
});

test('sessão: parado gasta só o repouso e não entra no histórico', () => {
  const { s } = simular(desafioDasPernas([foco]), [{ ...foco, pesoKg: 70 }], ['parado']);
  assert.equal(s.jogadores[0].blocos[0].reps, 0);
  assert.ok(s.jogadores[0].kcal < 3);
  assert.equal(s.registros().length, 0);
});

// ---- histórico

function memoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
}

test('histórico: grava, soma por dia, recorde, exporta e importa', () => {
  const arm = memoria();
  const h = new Historico(arm);
  h.perfil('foco').pesoKg = 82;
  h.adicionar({ perfil: 'foco', plano: 'desafio', inicio: '2026-11-15T22:10:00.000Z', fim: '2026-11-15T22:11:00.000Z', ativo: 55, kcal: 9.5, blocos: [{ exercicio: 'agachamento', reps: 24, segundos: 60 }], fadiga: 0.1 });
  h.adicionar({ perfil: 'foco', plano: 'desafio', inicio: '2026-11-16T22:10:00.000Z', fim: '2026-11-16T22:11:00.000Z', ativo: 58, kcal: 10.5, blocos: [{ exercicio: 'agachamento', reps: 28, segundos: 60 }], fadiga: 0.25 });
  h.adicionar({ perfil: 'animo', plano: 'treino', inicio: '2026-11-16T22:10:00.000Z', fim: '2026-11-16T22:30:00.000Z', ativo: 700, kcal: 60, blocos: [], fadiga: 0 });
  assert.equal(h.sessoesDe('foco').length, 2);
  assert.equal(h.recorde('foco', 'desafio'), 28);
  assert.equal(h.ritmoAnterior('foco', 'agachamento'), 26);
  const dias = h.porDia('foco', 7, new Date('2026-11-16T22:30:00.000Z'));
  assert.equal(dias.length, 7);
  assert.equal(dias.at(-1).kcal, 10.5);
  assert.equal(dias.at(-2).kcal, 9.5);
  assert.equal(h.totais('foco').dias, 2);

  // outro aparelho lê o que foi salvo e importa de novo sem duplicar
  const outro = new Historico(memoria());
  assert.equal(outro.importar(h.exportar()), 3);
  assert.equal(outro.importar(h.exportar()), 0);
  assert.equal(outro.perfil('foco').pesoKg, 82);
  assert.equal(outro.perfil('animo').restricoes.semImpacto, true);
  assert.throws(() => outro.importar('{"x":1}'));

  // os dados continuam depois de recarregar
  assert.equal(new Historico(arm).sessoesDe('foco').length, 2);
});

test('histórico: dados salvos com os ids antigos dos perfis passam para os ids novos, pela posição', () => {
  const arm = memoria();
  const antigo = {
    versao: 1,
    perfis: [
      { id: 'p1', pesoKg: 80, restricoes: {} },
      { id: 'p2', pesoKg: 60, restricoes: { profundidadeMax: 0.26 } },
      { id: 'p3', pesoKg: null, restricoes: {} },
    ],
    sessoes: [
      { id: 'p1-2026-11-15T22:10:00.000Z', perfil: 'p1', plano: 'desafio', inicio: '2026-11-15T22:10:00.000Z', kcal: 9, blocos: [{ exercicio: 'agachamento', reps: 24, segundos: 60 }] },
      { id: 'p2-2026-11-16T22:10:00.000Z', perfil: 'p2', plano: 'treino', inicio: '2026-11-16T22:10:00.000Z', kcal: 60, blocos: [] },
    ],
  };
  arm.setItem('pumpitgym-v1', JSON.stringify(antigo));
  const h = new Historico(arm);
  assert.equal(h.perfil('foco').pesoKg, 80);
  assert.equal(h.perfil('animo').pesoKg, 60);
  assert.equal(h.perfil('animo').restricoes.profundidadeMax, 0.26);
  assert.equal(h.perfil('animo').restricoes.semImpacto, true, 'o baixo impacto continua');
  assert.equal(h.recorde('foco', 'desafio'), 24);
  assert.equal(h.sessoesDe('animo')[0].id, 'animo-2026-11-16T22:10:00.000Z');
  // já gravou com os ids novos, e um backup antigo importado de novo não duplica
  assert.match(arm.getItem('pumpitgym-v1'), /"perfil": ?"foco"/);
  assert.equal(h.importar(JSON.stringify(antigo)), 0);
});
