// Perfis e sessões guardados no navegador (localStorage), com exportar e importar.
// O armazenamento vem de fora (localStorage ou um objeto igual), assim os testes rodam no Node.
import { ORDEM_ANTIGA, PERFIS_PADRAO } from '../treino/perfis.js';

const CHAVE = 'pumpitgym-v1';

const dataLocal = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export class Historico {
  constructor(armazenamento = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.armazenamento = armazenamento;
    this.dados = { versao: 1, perfis: PERFIS_PADRAO.map((p) => ({ ...p, restricoes: { ...p.restricoes } })), sessoes: [] };
    this.carregar();
  }

  carregar() {
    if (!this.armazenamento) return;
    try {
      const salvo = JSON.parse(this.armazenamento.getItem(CHAVE) || 'null');
      if (salvo && Array.isArray(salvo.sessoes)) {
        this.juntar(salvo);
        // grava logo com os ids novos dos perfis
        if (this.migrar(salvo) !== salvo) this.salvar();
      }
    } catch {
      // dados estragados: começa do zero, sem apagar o que está salvo até a próxima gravação
    }
  }

  salvar() {
    if (this.armazenamento) this.armazenamento.setItem(CHAVE, JSON.stringify(this.dados));
  }

  get perfis() {
    return this.dados.perfis;
  }

  perfil(id) {
    return this.dados.perfis.find((p) => p.id === id);
  }

  /** sessao: { perfil, plano, inicio (ISO), fim (ISO), ativo (s), kcal, blocos, fadiga, esforco, pontos } */
  adicionar(sessao) {
    const id = sessao.id || `${sessao.perfil}-${sessao.inicio}`;
    const nova = { ...sessao, id };
    this.dados.sessoes = this.dados.sessoes.filter((s) => s.id !== id);
    this.dados.sessoes.push(nova);
    this.dados.sessoes.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
    this.salvar();
    return nova;
  }

  sessoesDe(perfil) {
    return this.dados.sessoes.filter((s) => s.perfil === perfil);
  }

  // kcal de cada um dos últimos `dias` dias (o último é hoje): [{ data, kcal, sessoes }]
  porDia(perfil, dias = 14, hoje = new Date()) {
    const lista = [];
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - i);
      lista.push({ data: dataLocal(d.toISOString()), kcal: 0, sessoes: 0 });
    }
    for (const s of this.sessoesDe(perfil)) {
      const item = lista.find((x) => x.data === dataLocal(s.inicio));
      if (item) {
        item.kcal += s.kcal || 0;
        item.sessoes++;
      }
    }
    return lista;
  }

  totais(perfil) {
    const sessoes = this.sessoesDe(perfil);
    const dias = new Set(sessoes.map((s) => dataLocal(s.inicio)));
    return {
      sessoes: sessoes.length,
      dias: dias.size,
      kcal: sessoes.reduce((s, x) => s + (x.kcal || 0), 0),
      minutos: sessoes.reduce((s, x) => s + (x.ativo || 0), 0) / 60,
    };
  }

  // Resultados de um plano com recorde (desafio, teste30) em ordem de data: [{ inicio, valor }]
  resultados(perfil, plano) {
    return this.sessoesDe(perfil)
      .filter((s) => s.plano === plano)
      .map((s) => ({ inicio: s.inicio, valor: (s.blocos[0] && s.blocos[0].reps) || 0 }));
  }

  recorde(perfil, plano) {
    return this.resultados(perfil, plano).reduce((m, r) => Math.max(m, r.valor), 0);
  }

  // Média de repetições por minuto de um exercício nas sessões anteriores (para ver a perda de desempenho).
  ritmoAnterior(perfil, exercicio, ultimas = 5) {
    const ritmos = [];
    for (const s of this.sessoesDe(perfil)) {
      for (const b of s.blocos || []) if (b.exercicio === exercicio && b.segundos > 0 && b.reps > 0) ritmos.push((b.reps / b.segundos) * 60);
    }
    const r = ritmos.slice(-ultimas);
    return r.length ? r.reduce((s, x) => s + x, 0) / r.length : null;
  }

  exportar() {
    return JSON.stringify(this.dados, null, 2);
  }

  // Junta os dados de um arquivo exportado: sessões pelo id; o peso e os limites do arquivo valem.
  importar(texto) {
    const outro = JSON.parse(texto);
    if (!outro || !Array.isArray(outro.sessoes)) throw new Error('arquivo inválido');
    const antes = this.dados.sessoes.length;
    this.juntar(outro);
    this.salvar();
    return this.dados.sessoes.length - antes;
  }

  // Dados salvos com os ids antigos dos perfis: troca pelos ids novos (pela posição de cada perfil).
  migrar(outro) {
    const perfis = outro.perfis || [];
    const conhecidos = new Set(PERFIS_PADRAO.map((p) => p.id));
    if (perfis.length !== ORDEM_ANTIGA.length || perfis.some((p) => !p || conhecidos.has(p.id))) return outro;
    const novo = new Map(perfis.map((p, i) => [p.id, ORDEM_ANTIGA[i]]));
    return {
      ...outro,
      perfis: perfis.map((p) => ({ ...p, id: novo.get(p.id) })),
      sessoes: outro.sessoes.map((s) => {
        if (!s || !novo.has(s.perfil)) return s;
        const perfil = novo.get(s.perfil);
        const id = typeof s.id === 'string' && s.id.startsWith(`${s.perfil}-`) ? `${perfil}-${s.id.slice(s.perfil.length + 1)}` : s.id;
        return { ...s, perfil, id };
      }),
    };
  }

  juntar(outro) {
    outro = this.migrar(outro);
    for (const p of outro.perfis || []) {
      const meu = this.perfil(p.id);
      if (!meu) continue;
      if (p.pesoKg) meu.pesoKg = p.pesoKg;
      if (p.restricoes) meu.restricoes = { ...meu.restricoes, ...p.restricoes };
    }
    const ids = new Set(this.dados.sessoes.map((s) => s.id));
    for (const s of outro.sessoes) {
      if (!s || !s.id || !s.perfil || !s.inicio || ids.has(s.id)) continue;
      this.dados.sessoes.push(s);
      ids.add(s.id);
    }
    this.dados.sessoes.sort((a, b) => (a.inicio < b.inicio ? -1 : 1));
  }
}
