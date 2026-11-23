// Opinião: quando perguntar, fila de votos no navegador, envio ao formulário e QR code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Opiniao, VOTOS, desenharQr, juntarDados, linhasRosto, matrizQr } from '../js/motor/opiniao.js';

const CFG = {
  formulario: 'https://docs.google.com/forms/d/e/ABC/viewform',
  campos: { voto: 'entry.11', dados: 'entry.44' },
  minutosAntes: 4,
};

function memoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

function criar(o = {}) {
  const enviados = [];
  const guarda = o.armazenamento || memoria();
  const op = new Opiniao(o.cfg === undefined ? CFG : o.cfg, {
    versao: 'abc1234',
    sessao: 's1',
    armazenamento: guarda,
    agora: o.agora || (() => Date.UTC(2026, 10, 23, 12)),
    enviar: o.enviar || (async (url, corpo) => enviados.push({ url, corpo })),
    ...o.extra,
  });
  return { op, enviados, guarda };
}

test('sem formulário configurado, nunca pergunta nem envia', async () => {
  const { op, enviados } = criar({ cfg: null });
  op.contarJogo(3600);
  assert.equal(op.devePerguntar(), false);
  await op.votar('gostei');
  assert.equal(enviados.length, 0);
});

test('pergunta só depois do tempo mínimo de jogo, e uma vez', () => {
  const { op } = criar();
  op.contarJogo(3 * 60);
  assert.equal(op.devePerguntar(), false);
  op.contarJogo(61);
  assert.equal(op.devePerguntar(), true);
  op.pular();
  assert.equal(op.devePerguntar(), false);
});

test('depois de perguntar, espera horas antes de perguntar de novo em outra visita', () => {
  let agora = Date.UTC(2026, 10, 23, 12);
  const guarda = memoria();
  const a = criar({ armazenamento: guarda, agora: () => agora }).op;
  a.contarJogo(600);
  a.pular();
  agora += 2 * 3600e3;
  const b = criar({ armazenamento: guarda, agora: () => agora }).op;
  b.contarJogo(600);
  assert.equal(b.devePerguntar(), false, 'duas horas depois');
  agora += 20 * 3600e3;
  assert.equal(b.devePerguntar(), true, 'no outro dia');
});

test('desligada (robô, testes) não pergunta', () => {
  const { op } = criar({ extra: { desligada: true } });
  op.contarJogo(3600);
  assert.equal(op.devePerguntar(), false);
});

test('?opiniao=1 pergunta logo', () => {
  const { op } = criar({ extra: { sempre: true } });
  assert.equal(op.devePerguntar(), true);
});

test('o voto vai para o formResponse com o texto da opção e os dados da partida', async () => {
  const { op, enviados, guarda } = criar();
  op.contarJogo(7 * 60);
  await op.votar('medio', { fase: 2, jogadores: 1 });
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].url, 'https://docs.google.com/forms/d/e/ABC/formResponse');
  assert.equal(enviados[0].corpo['entry.11'], 'Mais ou menos');
  assert.equal(enviados[0].corpo['entry.44'], 'v=abc1234;sessao=s1;quando=2026-11-23T12:00:00.000Z;min=7;fase=2;jogadores=1');
  assert.equal(guarda.getItem('opiniao-fila'), null, 'fila vazia depois do envio');
});

test('um envio com a fila vazia não trava os envios seguintes', async () => {
  const { op, enviados } = criar();
  await op.enviarFila();
  await op.votar('gostei');
  await op.votar('nao');
  assert.equal(enviados.length, 2);
  assert.equal(op.lerFila().length, 0);
});

test('sem internet, o voto fica na fila e sai na próxima tentativa', async () => {
  let online = false;
  const enviados = [];
  const guarda = memoria();
  const enviar = async (url, corpo) => {
    if (!online) throw new TypeError('Failed to fetch');
    enviados.push(corpo);
  };
  const a = criar({ armazenamento: guarda, enviar }).op;
  await a.votar('gostei');
  assert.equal(a.lerFila().length, 1);
  // outra visita, já com internet
  online = true;
  const b = criar({ armazenamento: guarda, enviar }).op;
  await b.enviarFila();
  assert.equal(enviados.length, 1);
  assert.equal(enviados[0]['entry.11'], 'Gostei muito');
  assert.equal(b.lerFila().length, 0);
});

test('a fila não cresce sem limite', async () => {
  const { op } = criar({ enviar: async () => { throw new Error('offline'); } });
  for (let k = 0; k < 40; k++) await op.votar('nao');
  assert.equal(op.lerFila().length, 30);
});

test('dados não levam separadores dentro dos valores', () => {
  assert.equal(juntarDados({ a: 'x;y=z', b: null, c: 0 }), 'a=x y z;c=0');
});

test('link do QR já preenche voto e sessão', () => {
  const { op } = criar();
  const url = new URL(op.urlFormulario('gostei'));
  assert.equal(url.origin + url.pathname, 'https://docs.google.com/forms/d/e/ABC/viewform');
  assert.equal(url.searchParams.get('usp'), 'pp_url');
  assert.equal(url.searchParams.get('entry.11'), 'Gostei muito');
  assert.equal(url.searchParams.get('entry.44'), 'v=abc1234;sessao=s1;origem=qr');
  assert.equal(new URL(op.urlFormulario()).searchParams.has('entry.11'), false);
});

test('QR de um link real do Forms cabe numa tela pequena', () => {
  const op = new Opiniao(
    { formulario: `https://docs.google.com/forms/d/e/1FAIpQLS${'x'.repeat(48)}/viewform`, campos: { voto: 'entry.1234567890', dados: 'entry.1987654321' } },
    { versao: 'abc1234', armazenamento: memoria() },
  );
  const q = op.qr('medio');
  assert.ok(q.n <= 57, `QR com ${q.n} módulos`);
  assert.equal(typeof q.escuro(0, 0), 'boolean');
  assert.equal(q.escuro(0, 0), true, 'canto do padrão de posição');
  assert.equal(op.qr('medio'), q, 'guarda o QR já feito');
});

test('QR igual ao de outra biblioteca para o mesmo texto', () => {
  // referência: o pacote Python qrcode (nível L, máscara 2) dá a mesma matriz de 53×53
  const texto = `https://docs.google.com/forms/d/e/1FAIpQLS${'x'.repeat(48)}/viewform?usp=pp_url&entry.1234567890=Mais+ou+menos&entry.1987654321=v%3Dabc1234%3Bsessao%3Dk3f9a2%3Borigem%3Dqr`;
  const q = matrizQr(texto);
  let s = '';
  for (let l = 0; l < q.n; l++) {
    for (let c = 0; c < q.n; c++) s += q.escuro(l, c) ? '1' : '0';
    s += '\n';
  }
  assert.equal(createHash('sha256').update(s).digest('hex'), '88649121ab2c7b7558ac6321750d584e528bb438f7b0e0a7a259515956dba311');
});

test('rostos têm 13×13 pixels e as bocas são diferentes', () => {
  const desenhos = VOTOS.map((v) => linhasRosto(v.id));
  for (const d of desenhos) {
    assert.equal(d.length, 13);
    for (const l of d) assert.equal(l.length, 13, l);
  }
  assert.notDeepEqual(desenhos[0], desenhos[1]);
  assert.notDeepEqual(desenhos[1], desenhos[2]);
});

test('o desenho do QR cobre exatamente os módulos escuros', () => {
  const qr = matrizQr('https://exemplo.com/a');
  const pintados = new Set();
  const ctx = {
    fillRect(x, y, l, a) {
      if (this.fillStyle !== '#000000') return;
      for (let c = x / 2; c < (x + l) / 2; c++) for (let k = y / 2; k < (y + a) / 2; k++) pintados.add(`${k - 4},${c - 4}`);
    },
  };
  desenharQr(ctx, qr, 0, 0, 2);
  let escuros = 0;
  for (let l = 0; l < qr.n; l++) {
    for (let c = 0; c < qr.n; c++) {
      if (qr.escuro(l, c)) {
        escuros++;
        assert.ok(pintados.has(`${l},${c}`), `${l},${c}`);
      }
    }
  }
  assert.equal(pintados.size, escuros);
});
