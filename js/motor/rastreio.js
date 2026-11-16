// Decide qual corpo visto pela câmera pertence a cada jogador.
// Com dois corpos, quem está à esquerda da tela (imagem espelhada) é o jogador 1.
import { PONTO } from './gestos.js';

function centroX(pontos) {
  return 1 - (pontos[PONTO.quadrilE].x + pontos[PONTO.quadrilD].x) / 2;
}

function tamanho(pontos) {
  const o = pontos[PONTO.ombroE];
  const q = pontos[PONTO.quadrilE];
  return Math.hypot(o.x - q.x, o.y - q.y);
}

export class Rastreador {
  constructor(jogadores = 1) {
    this.jogadores = jogadores;
    this.ultimoX = [0.3, 0.7];
  }

  /** @returns {Array} uma lista com `jogadores` posições: os pontos do corpo ou null */
  atribuir(poses) {
    const saida = new Array(this.jogadores).fill(null);
    if (!poses || poses.length === 0) return saida;

    if (this.jogadores === 1) {
      // a pessoa mais perto da câmera (maior tronco) joga
      let melhor = poses[0];
      for (const p of poses) if (tamanho(p) > tamanho(melhor)) melhor = p;
      saida[0] = melhor;
      return saida;
    }

    if (poses.length >= 2) {
      const ordenadas = [...poses].sort((a, b) => centroX(a) - centroX(b));
      saida[0] = ordenadas[0];
      saida[1] = ordenadas[ordenadas.length - 1];
    } else {
      const x = centroX(poses[0]);
      const i = Math.abs(x - this.ultimoX[0]) <= Math.abs(x - this.ultimoX[1]) ? 0 : 1;
      saida[i] = poses[0];
    }
    saida.forEach((p, i) => {
      if (p) this.ultimoX[i] = centroX(p);
    });
    return saida;
  }
}
