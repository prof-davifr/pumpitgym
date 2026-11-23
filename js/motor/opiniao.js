// Opinião de quem joga: depois de alguns minutos de jogo, uma tela pede um voto rápido (três rostos)
// e mostra um QR code para quem quiser escrever mais no Google Forms do jogo.
// O voto entra numa fila no navegador e sai para o formulário; sem internet, fica para a próxima vez.
// Módulo igual em todos os jogos da série: corrija aqui e copie para os outros.
import { qrcode } from '../../vendor/qrcode/qrcode.mjs';

// Os textos são as opções do formulário: o Google só aceita o voto se o texto for igual.
export const VOTOS = [
  { id: 'gostei', texto: 'Gostei muito', cor: '#7ad04a' },
  { id: 'medio', texto: 'Mais ou menos', cor: '#ffd23c' },
  { id: 'nao', texto: 'Não gostei', cor: '#ff8a5c' },
];

const CHAVE_FILA = 'opiniao-fila';
const CHAVE_ULTIMA = 'opiniao-ultima';
const MAX_FILA = 30;
const HORAS_ENTRE_PERGUNTAS = 20;

function armazenamentoPadrao() {
  try {
    const ls = globalThis.localStorage;
    ls.setItem('opiniao-teste', '1');
    ls.removeItem('opiniao-teste');
    return ls;
  } catch {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  }
}

// A resposta do Google não chega (no-cors): só um erro de rede deixa o voto na fila.
async function enviarPadrao(url, corpo) {
  await fetch(url, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(corpo) });
}

// 'chave=valor;...' com os dados da partida, sem os separadores dentro dos valores
export function juntarDados(dados) {
  return Object.entries(dados)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${String(v).replace(/[;=\n]/g, ' ')}`)
    .join(';');
}

export class Opiniao {
  // cfg: { formulario: '.../viewform', campos: { voto: 'entry.N', dados: 'entry.M' }, minutosAntes }
  constructor(cfg, o = {}) {
    this.cfg = cfg || {};
    this.versao = o.versao || 'local';
    this.guarda = o.armazenamento || armazenamentoPadrao();
    this.enviar = o.enviar || enviarPadrao;
    this.agora = o.agora || (() => Date.now());
    this.desligada = !!o.desligada;
    this.sempre = !!o.sempre; // ?opiniao=1: pergunta logo, para testar a tela
    this.sessao = o.sessao || Math.random().toString(36).slice(2, 8);
    this.segundosJogo = 0;
    this.perguntou = false;
    this.enviando = null;
  }

  get ativa() {
    return !this.desligada && !!(this.cfg.formulario && this.cfg.campos && this.cfg.campos.voto && this.cfg.campos.dados);
  }

  contarJogo(segundos) {
    this.segundosJogo += segundos;
  }

  devePerguntar() {
    if (!this.ativa || this.perguntou) return false;
    if (this.sempre) return true;
    if (this.segundosJogo < (this.cfg.minutosAntes ?? 4) * 60) return false;
    const ultima = Number(this.guarda.getItem(CHAVE_ULTIMA) || 0);
    return this.agora() - ultima >= HORAS_ENTRE_PERGUNTAS * 3600e3;
  }

  // votou ou pulou: não pergunta de novo nesta visita nem nas próximas horas
  marcarPergunta() {
    this.perguntou = true;
    this.guarda.setItem(CHAVE_ULTIMA, String(this.agora()));
  }

  pular() {
    this.marcarPergunta();
  }

  // contexto: dados da partida (fase, pontos, jogadores...); o tempo de jogo entra sozinho
  votar(id, contexto = {}) {
    const voto = VOTOS.find((v) => v.id === id);
    if (!voto) throw new Error(`voto desconhecido: ${id}`);
    this.marcarPergunta();
    if (!this.ativa) return Promise.resolve();
    const dados = juntarDados({
      v: this.versao,
      sessao: this.sessao,
      quando: new Date(this.agora()).toISOString(),
      min: Math.round(this.segundosJogo / 60),
      ...contexto,
    });
    const fila = this.lerFila();
    fila.push({ voto: voto.texto, dados });
    this.gravarFila(fila.slice(-MAX_FILA));
    return this.enviarFila();
  }

  lerFila() {
    try {
      const f = JSON.parse(this.guarda.getItem(CHAVE_FILA) || '[]');
      return Array.isArray(f) ? f : [];
    } catch {
      return [];
    }
  }

  gravarFila(fila) {
    if (fila.length) this.guarda.setItem(CHAVE_FILA, JSON.stringify(fila));
    else this.guarda.removeItem(CHAVE_FILA);
  }

  get urlResposta() {
    return this.cfg.formulario.replace(/\/viewform.*$/, '/formResponse');
  }

  // Manda os votos da fila, um de cada vez; para no primeiro erro e tenta de novo depois.
  enviarFila() {
    if (!this.ativa) return Promise.resolve();
    if (!this.enviando) this.enviando = this.esvaziarFila().finally(() => (this.enviando = null));
    return this.enviando;
  }

  async esvaziarFila() {
    try {
      for (;;) {
        const fila = this.lerFila();
        if (!fila.length) return;
        const { voto, dados } = fila[0];
        await this.enviar(this.urlResposta, { [this.cfg.campos.voto]: voto, [this.cfg.campos.dados]: dados });
        // a fila pode ter crescido durante o envio: tira só o que saiu
        const agora = this.lerFila();
        if (agora.length && agora[0].dados === dados) this.gravarFila(agora.slice(1));
      }
    } catch {
      // sem internet: o voto fica na fila
    }
  }

  // Link do formulário já com a sessão (e o voto, se houver), para ligar o comentário à partida.
  urlFormulario(id = null) {
    const p = new URLSearchParams({ usp: 'pp_url' });
    const voto = VOTOS.find((v) => v.id === id);
    if (voto) p.set(this.cfg.campos.voto, voto.texto);
    p.set(this.cfg.campos.dados, juntarDados({ v: this.versao, sessao: this.sessao, origem: 'qr' }));
    return `${this.cfg.formulario.replace(/\?.*$/, '')}?${p}`;
  }

  // Módulos do QR code: { n, escuro(linha, coluna) }
  qr(id = null) {
    const chave = id || '-';
    if (this.qrGuardado && this.qrGuardado.chave === chave) return this.qrGuardado.qr;
    const q = matrizQr(this.urlFormulario(id));
    this.qrGuardado = { chave, qr: q };
    return q;
  }
}

export function matrizQr(texto) {
  const q = qrcode(0, 'L');
  q.addData(texto, 'Byte');
  q.make();
  const n = q.getModuleCount();
  return { n, escuro: (l, c) => q.isDark(l, c) };
}

// Desenha o QR com a margem branca de 4 módulos; devolve o lado total em pixels.
// sobra: quanto cada bloco passa do seu lugar, para não abrir frestas quando a tela tem escala quebrada.
export function desenharQr(ctx, qr, x, y, modulo, sobra = 0) {
  const lado = (qr.n + 8) * modulo;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, lado, lado);
  ctx.fillStyle = '#000000';
  for (let l = 0; l < qr.n; l++) {
    // módulos escuros vizinhos na linha saem num retângulo só
    for (let c = 0; c < qr.n; ) {
      if (!qr.escuro(l, c)) {
        c++;
        continue;
      }
      let fim = c;
      while (fim < qr.n && qr.escuro(l, fim)) fim++;
      ctx.fillRect(x + (c + 4) * modulo, y + (l + 4) * modulo, (fim - c) * modulo + sobra, modulo + sobra);
      c = fim;
    }
  }
  return lado;
}

// Rostos de 13×13 pixels: # contorno, o cor do voto, b boca e olhos
const ROSTO = [
  '....#####....',
  '..##ooooo##..',
  '.#ooooooooo#.',
  '.#ooooooooo#.',
  '#ooobooobooo#',
  '#ooobooobooo#',
  '#ooooooooooo#',
  '#ooooooooooo#',
  null,
  null,
  '.#ooooooooo#.',
  '..##ooooo##..',
  '....#####....',
];
const BOCAS = {
  gostei: ['#ooboooooboo#', '#ooobbbbbooo#'],
  medio: ['#ooooooooooo#', '#ooobbbbbooo#'],
  nao: ['#ooobbbbbooo#', '#ooboooooboo#'],
};

export function linhasRosto(id) {
  const [a, b] = BOCAS[id];
  return ROSTO.map((l, k) => (k === 8 ? a : k === 9 ? b : l));
}

// Desenha um rosto de voto com pixels de tamanho `px`, a partir do canto (x, y). o.sobra: ver desenharQr.
export function desenharRosto(ctx, id, x, y, px, o = {}) {
  const cores = { '#': o.contorno || '#1e1428', o: o.cor || VOTOS.find((v) => v.id === id).cor, b: o.contorno || '#1e1428' };
  const sobra = o.sobra || 0;
  linhasRosto(id).forEach((linha, l) => {
    for (let c = 0; c < linha.length; ) {
      const ch = linha[c];
      let fim = c + 1;
      while (fim < linha.length && linha[fim] === ch) fim++;
      if (ch !== '.') {
        ctx.fillStyle = cores[ch];
        ctx.fillRect(x + c * px, y + l * px, (fim - c) * px + sobra, px + sobra);
      }
      c = fim;
    }
  });
  return 13 * px;
}
