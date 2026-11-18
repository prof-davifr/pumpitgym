// Os perfis de quem treina e os cuidados de cada um.
//
// O perfil Ânimo é de baixo impacto:
// - sem impacto (nenhum salto) e sem giro do pé com carga;
// - agachamento parcial, com profundidade máxima (o app avisa DESÇA MENOS);
// - descida lenta.
// A carga no joelho cresce com a flexão profunda e com a rotação.

export const PERFIS_PADRAO = [
  {
    id: 'animo', nome: 'ÂNIMO', cor: '#ff2bd6', pesoKg: null,
    restricoes: { semImpacto: true, semGiro: true, semFlexaoProfunda: true, profundidadeMax: 0.3, descidaLenta: true },
  },
  { id: 'foco', nome: 'FOCO', cor: '#21f6ff', pesoKg: null, restricoes: {} },
  { id: 'forca', nome: 'FORÇA', cor: '#ffe14a', pesoKg: null, restricoes: {} },
];

// Os perfis tinham outros ids. Os dados salvos e os backups antigos guardam os perfis nesta ordem:
// o perfil na posição i de um arquivo antigo passa a ser o perfil com o id ORDEM_ANTIGA[i].
export const ORDEM_ANTIGA = ['foco', 'animo', 'forca'];

export const PESO_PADRAO = 70;

// Um exercício serve para o perfil?
export function permitido(ex, perfil) {
  const r = (perfil && perfil.restricoes) || {};
  if (r.semImpacto && ex.impacto) return false;
  if (r.semGiro && ex.giro) return false;
  if (r.semFlexaoProfunda && ex.flexaoProfunda) return false;
  return true;
}
