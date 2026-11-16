// Laço principal: lê a entrada, atualiza a cena e desenha.
import { LARGURA, ALTURA, CORES, opcoes } from './config.js';
import { Entrada } from './motor/entrada.js';
import { Audio } from './som/audio.js';
import { Historico } from './dados/historico.js';
import { fundo, linhasDeTv, TITULO, TEXTO } from './arte/neon.js';
import { desenharPessoa } from './arte/avatar.js';
import { desenharCursores } from './ui.js';
import { Titulo } from './cenas/titulo.js';
import { Jogadores } from './cenas/jogadores.js';
import { Peso } from './cenas/peso.js';
import { Calibracao } from './cenas/calibracao.js';
import { MenuPrincipal } from './cenas/menu.js';
import { CenaSessao } from './cenas/sessao.js';
import { Esforco } from './cenas/esforco.js';
import { Resultado } from './cenas/resultado.js';
import { Evolucao } from './cenas/evolucao.js';
import { Opcoes } from './cenas/opcoes.js';

const CENAS = {
  titulo: Titulo, jogadores: Jogadores, peso: Peso, calibracao: Calibracao, menu: MenuPrincipal,
  sessao: CenaSessao, esforco: Esforco, resultado: Resultado, evolucao: Evolucao, opcoes: Opcoes,
};

const tela = document.getElementById('tela');
const c = tela.getContext('2d');
let escala = 1;
let margemX = 0;
let margemY = 0;

function ajustar() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  tela.width = Math.round(window.innerWidth * dpr);
  tela.height = Math.round(window.innerHeight * dpr);
  escala = Math.min(tela.width / LARGURA, tela.height / ALTURA);
  margemX = (tela.width - LARGURA * escala) / 2;
  margemY = (tela.height - ALTURA * escala) / 2;
}
window.addEventListener('resize', ajustar);
ajustar();

// do ponteiro (pixels da página) para a tela lógica
function converter(px, py) {
  const dpr = tela.width / window.innerWidth;
  return { x: (px * dpr - margemX) / escala, y: (py * dpr - margemY) / escala };
}

const app = {
  c,
  t: 0,
  opcoes,
  entrada: new Entrada(tela),
  audio: new Audio(),
  historico: new Historico(),
  jogadores: [], // perfis das pessoas que treinam agora (1 ou 2)
  cena: null,
  nomeCena: '',
  transicao: 1,

  trocar(nome, dados = {}) {
    this.nomeCena = nome;
    this.cena = new CENAS[nome](this, dados);
    this.transicao = 1;
    // deixa os testes automáticos lerem o estado
    document.documentElement.dataset.cena = nome;
  },

  // onde a imagem da câmera aparece na tela (ocupa a altura toda)
  get area() {
    const l = ALTURA * this.entrada.aspecto;
    return { x: (LARGURA - l) / 2, y: 0, l, a: ALTURA };
  },

  // a imagem da câmera, espelhada e escurecida
  desenharVideo(alfa = 0.35) {
    const e = this.entrada;
    if (e.robo || e.camera.estado !== 'pronta') return;
    const a = this.area;
    c.save();
    c.globalAlpha = alfa;
    c.translate(a.x + a.l, a.y);
    c.scale(-1, 1);
    c.drawImage(e.camera.video, 0, 0, a.l, a.a);
    c.restore();
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = '#7a3fd0';
    c.fillRect(a.x, a.y, a.l, a.a);
    c.restore();
  },

  desenharPessoas() {
    const e = this.entrada;
    for (let i = 0; i < e.n; i++) {
      const L = e.j[i].leitor;
      if (!e.j[i].presente) continue;
      const cor = (this.jogadores[i] && this.jogadores[i].cor) || CORES.jogadores[i];
      desenharPessoa(c, L.q, e.aspecto, this.area, cor, (L.base && L.base.tronco) || L.tronco);
    }
  },

  fundo(escuro = 0) {
    fundo(c, this.t, escuro);
  },
};
window.pumpitgym = app;

// ?passos=N roda N passos de 1/60 s em cada quadro, para os testes com ?robo=1 andarem depressa
const PASSOS = Math.max(1, Math.min(60, Number(new URLSearchParams(location.search).get('passos')) || 1));

let anterior = performance.now();
function quadro(agora) {
  const dt = PASSOS > 1 ? 1 / 60 : Math.min(0.1, (agora - anterior) / 1000);
  anterior = agora;
  for (let k = 0; k < PASSOS; k++) {
    app.t += dt;
    app.entrada.atualizar(app.t, converter);
    if (app.entrada.usouGesto) app.audio.ligar();
    app.cena.atualizar(dt);
  }

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#07020f';
  c.fillRect(0, 0, tela.width, tela.height);
  c.setTransform(escala, 0, 0, escala, margemX, margemY);
  c.save();
  c.beginPath();
  c.rect(0, 0, LARGURA, ALTURA);
  c.clip();
  app.cena.desenhar(c);
  if (!app.cena.semCursor) desenharCursores(c, app);
  linhasDeTv(c);
  if (app.transicao > 0) {
    app.transicao = Math.max(0, app.transicao - dt * 3);
    c.fillStyle = `rgba(18,5,43,${app.transicao})`;
    c.fillRect(0, 0, LARGURA, ALTURA);
  }
  c.restore();
  requestAnimationFrame(quadro);
}

// espera as fontes para o primeiro desenho sair certo
Promise.all([document.fonts.load(`40px ${TITULO}`), document.fonts.load(`700 20px ${TEXTO}`)])
  .catch(() => {})
  .then(() => {
    app.trocar('titulo');
    requestAnimationFrame(quadro);
  });
