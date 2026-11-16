import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rodar } from './ajuda.mjs';

test('a calibração termina com a pessoa parada em pé', () => {
  assert.ok(rodar('parado', { reps: 1 }).L.calibrado);
});

test('ficar parado não conta nenhuma repetição', () => {
  assert.deepEqual(rodar('parado', { reps: 8 }).n, {});
});

const UMA_POR_CICLO = [
  ['agachamento', 'agachamento', {}],
  ['agachamentoParcial', 'agachamento', {}],
  ['sentarLevantar', 'agachamento', {}],
  ['pulo', 'pulo', { ciclo: 1.4 }],
  ['polichinelo', 'polichinelo', { ciclo: 1.3 }],
  ['panturrilha', 'panturrilha', { baseFirme: true }],
  ['afundo', 'afundo', { ciclo: 2.4 }],
  ['ponte', 'ponte', { ciclo: 2.4 }],
];
for (const [anim, contador, o] of UMA_POR_CICLO) {
  test(`${anim}: uma repetição de ${contador} por movimento`, () => {
    assert.equal(rodar(anim, o).n[contador] || 0, 6);
  });
}

const DUAS_POR_CICLO = [
  ['marcha', 'corrida', { ciclo: 1.2 }],
  ['corrida', 'corrida', { ciclo: 0.8 }],
  ['abducao', 'abducao', { ciclo: 3 }],
  ['polichineloPasso', 'polichinelo', { ciclo: 2.4 }],
];
for (const [anim, contador, o] of DUAS_POR_CICLO) {
  test(`${anim}: uma repetição de ${contador} para cada lado`, () => {
    assert.equal(rodar(anim, o).n[contador] || 0, 12);
  });
}

test('o agachamento não conta como afundo, e a base larga não conta como perna para o lado', () => {
  assert.equal(rodar('agachamento').n.afundo || 0, 0);
  assert.equal(rodar('polichinelo', { ciclo: 1.3 }).n.abducao || 0, 0);
});

test('a ponta dos pés não conta como pulo', () => {
  assert.equal(rodar('panturrilha', { baseFirme: true }).n.pulo || 0, 0);
});

test('o agachamento parado conta o tempo na posição', () => {
  assert.ok(rodar('cadeirinha', { reps: 3 }).seg.cadeirinha > 120);
});

test('o agachamento informa a amplitude e os tempos de descida e de subida', () => {
  const { todas } = rodar('agachamento', { ciclo: 3 });
  const r = todas.find((x) => x.nome === 'agachamento');
  assert.ok(r.amplitude > 0.3 && r.amplitude < 0.4, `amplitude ${r.amplitude}`);
  assert.ok(r.subida > 0.6 && r.subida < 1.5, `subida ${r.subida}`);
  assert.ok(r.descida > 0.6 && r.descida < 1.5, `descida ${r.descida}`);
  assert.ok(r.velocidade > 0);
});

test('as contagens valem perto e longe da câmera e para as duas posições na tela', () => {
  for (const camera of [{ escala: 0.1, centro: 0.3 }, { escala: 0.2, centro: 0.7, chao: 0.97 }]) {
    assert.equal(rodar('agachamento', { camera }).n.agachamento, 6);
    assert.equal(rodar('abducao', { camera, ciclo: 3 }).n.abducao, 12);
  }
});
