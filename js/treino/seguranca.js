// Avisos de segurança durante um exercício, de acordo com o perfil da pessoa.
// Lógica pura (sem DOM), assim os testes rodam no Node.

/**
 * @param {object} perfil { restricoes }
 * @param {object} ex exercício do catálogo
 * @param {object|null} medidas medidas do quadro (LeitorCorpo)
 * @param {object} reps repetições que terminaram neste quadro, por contador
 * @returns {string|null} texto do aviso
 */
export function avisoDeSeguranca(perfil, ex, medidas, reps = {}) {
  const r = (perfil && perfil.restricoes) || {};
  if (r.semImpacto && reps.pulo) return 'SEM PULAR';
  if (!medidas) return null;
  if (r.profundidadeMax && !ex.semLimite && medidas.emPe && medidas.profundidade > r.profundidadeMax) return 'DESÇA MENOS';
  const rep = reps[ex.contador];
  if (r.descidaLenta && ex.contador === 'agachamento' && !ex.semLimite && rep && rep.descida !== null && rep.descida !== undefined && rep.descida < 1.0) {
    return 'MAIS DEVAGAR';
  }
  return null;
}
