// Fecha o app. A janela que o iniciar.sh abre (Chrome com --app) aceita window.close();
// numa aba comum o navegador recusa, e a tela pede para fechar com Alt+F4.
import { CORES } from '../config.js';

export const saida = { pedida: false, recusada: false };

export function sairDoJogo() {
  saida.pedida = true;
  window.close();
  setTimeout(() => {
    if (!window.closed) saida.recusada = true;
  }, 500);
}

// Botão SAIR dos menus: a primeira escolha pede a confirmação, a segunda fecha o app.
// A pergunta some depois de 5 s, para uma escolha sem querer não ficar armada.
export function botaoSair(x, y, l, a) {
  return { id: 'sair', x, y, l, a, rotulo: 'SAIR', cor: CORES.vermelho, tam: 26, confirmarAte: -1 };
}

export function escolherSair(b, t) {
  if (b.confirmarAte >= t) sairDoJogo();
  b.confirmarAte = t + 5;
}

export function atualizarBotaoSair(b, t) {
  const confirmar = b.confirmarAte >= t;
  b.rotulo = saida.recusada ? 'ALT+F4' : confirmar ? 'SAIR?' : 'SAIR';
  b.sub = saida.recusada ? 'FECHE A JANELA COM' : confirmar ? 'ESCOLHA DE NOVO' : '';
}
