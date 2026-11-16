// As pessoas da casa e os cuidados de cada uma.
//
// O perfil do Ânimo é de baixo impacto:
// - sem impacto (nenhum salto) e sem giro do pé com carga;
// - agachamento parcial, com profundidade máxima (o app avisa DESÇA MENOS);
// - descida lenta.
// A carga no joelho cresce com a flexão profunda e com a rotação.

export const PERFIS_PADRAO = [
  { id: 'foco', nome: 'FOCO', cor: '#21f6ff', pesoKg: null, restricoes: {} },
  {
    id: 'animo', nome: 'ÂNIMO', cor: '#ff2bd6', pesoKg: null,
    restricoes: { semImpacto: true, semGiro: true, semFlexaoProfunda: true, profundidadeMax: 0.3, descidaLenta: true },
  },
  { id: 'forca', nome: 'FORÇA', cor: '#ffe14a', pesoKg: null, restricoes: {} },
];

export const PESO_PADRAO = 70;

// Um exercício serve para o perfil?
export function permitido(ex, perfil) {
  const r = (perfil && perfil.restricoes) || {};
  if (r.semImpacto && ex.impacto) return false;
  if (r.semGiro && ex.giro) return false;
  if (r.semFlexaoProfunda && ex.flexaoProfunda) return false;
  return true;
}
