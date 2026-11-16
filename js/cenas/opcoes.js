// Opções. Cada botão mostra o valor atual e troca para o próximo valor.
import { LARGURA, CORES, opcoes, salvarOpcoes } from '../config.js';
import { texto } from '../arte/neon.js';
import { Menu, grade } from '../ui.js';

const proximo = (lista, atual) => lista[(lista.indexOf(atual) + 1) % lista.length];
const SIM = (v) => (v ? 'SIM' : 'NÃO');

export class Opcoes {
  constructor(app) {
    this.app = app;
    this.mensagem = '';
    this.animo = app.historico.perfil('animo');
    const itens = ['voltas', 'chao', 'limite', 'sensibilidade', 'volume', 'voz', 'precisao', 'pesos', 'musica', 'bpm', 'exportar', 'importar'].map((id) => ({ id, rotulo: '', cor: CORES.ciano, tam: 21 }));
    const botoes = grade(itens, { colunas: 4, x: 40, y: 110, l: LARGURA - 80, a: 420, folga: 18 });
    botoes.push({ id: 'voltar', x: LARGURA / 2 - 170, y: 585, l: 340, a: 80, rotulo: 'VOLTAR', cor: CORES.roxo, tam: 26 });
    this.menu = new Menu(botoes, { tempo: 1.2, voltar: 'voltar' });
    this.rotular();

    this.arquivoMusica = document.getElementById('arquivo-musica');
    this.arquivoDados = document.getElementById('arquivo-dados');
    this.arquivoMusica.onchange = () => {
      const f = this.arquivoMusica.files[0];
      if (f) {
        app.audio.usarArquivo(f);
        this.mensagem = `MÚSICA: ${f.name.toUpperCase()}. AJUSTE AS BATIDAS POR MINUTO PARA A DANÇA.`;
      }
      this.arquivoMusica.value = '';
      this.rotular();
    };
    this.arquivoDados.onchange = async () => {
      const f = this.arquivoDados.files[0];
      this.arquivoDados.value = '';
      if (!f) return;
      try {
        const n = app.historico.importar(await f.text());
        this.mensagem = `IMPORTAÇÃO PRONTA: ${n} SESSÕES NOVAS.`;
      } catch {
        this.mensagem = 'ESTE ARQUIVO NÃO É UM BACKUP DO PUMPITGYM.';
      }
      this.rotular();
    };
  }

  rotular() {
    const audio = this.app.audio;
    const r = this.animo.restricoes;
    const dados = {
      voltas: [`VOLTAS: ${opcoes.voltas}`, 'DO CIRCUITO NO TREINO DO DIA'],
      chao: [`PONTE NO CHÃO: ${SIM(opcoes.chao)}`, 'DEITADO, DE LADO PARA A CÂMERA'],
      limite: [`LIMITE DO ÂNIMO: ${Math.round(r.profundidadeMax * 100)} %`, 'DESCIDA MÁXIMA (30 % ≈ JOELHO A 90°)'],
      sensibilidade: [`SENSIBILIDADE: ${opcoes.sensibilidade.toUpperCase().replace('MEDIA', 'MÉDIA')}`, 'ALTA CONTA MOVIMENTOS MENORES'],
      volume: [`VOLUME: ${Math.round(opcoes.volume * 100)} %`, ''],
      voz: [`VOZ: ${SIM(opcoes.voz)}`, 'FALA OS EXERCÍCIOS E OS AVISOS'],
      precisao: [`CÂMERA: ${opcoes.precisao.toUpperCase()}`, 'ALTA É MAIS LENTA. RECARREGA A PÁGINA'],
      pesos: ['PESOS', this.app.historico.perfis.map((p) => `${p.nome} ${p.pesoKg || '—'}`).join(' · ')],
      musica: [audio.arquivo ? 'TIRAR MINHA MÚSICA' : 'MINHA MÚSICA', audio.arquivo ? audio.nomeArquivo.toUpperCase() : 'ARQUIVO DO APARELHO (USE O MOUSE)'],
      bpm: [`BATIDAS: ${opcoes.bpmProprio} BPM`, 'DA SUA MÚSICA, PARA A DANÇA'],
      exportar: ['EXPORTAR DADOS', 'BAIXA UM ARQUIVO DE BACKUP'],
      importar: ['IMPORTAR DADOS', 'JUNTA UM BACKUP (USE O MOUSE)'],
    };
    for (const b of this.menu.botoes) if (dados[b.id]) [b.rotulo, b.sub] = dados[b.id];
  }

  atualizar() {
    const app = this.app;
    const b = this.menu.atualizar(app);
    if (!b) return;
    this.mensagem = '';
    const r = this.animo.restricoes;
    switch (b.id) {
      case 'voltar': return app.trocar(app.jogadores.length ? 'menu' : 'titulo');
      case 'voltas': opcoes.voltas = proximo([1, 2, 3], opcoes.voltas); break;
      case 'chao': opcoes.chao = !opcoes.chao; break;
      case 'limite':
        r.profundidadeMax = proximo([0.22, 0.26, 0.3, 0.34], r.profundidadeMax);
        app.historico.salvar();
        break;
      case 'sensibilidade':
        opcoes.sensibilidade = proximo(['baixa', 'media', 'alta'], opcoes.sensibilidade);
        for (const j of app.entrada.j) j.leitor.fator = { baixa: 1.3, media: 1, alta: 0.75 }[opcoes.sensibilidade];
        break;
      case 'volume':
        opcoes.volume = proximo([0, 0.3, 0.5, 0.7, 1], opcoes.volume);
        app.audio.ajustarVolume();
        break;
      case 'voz': opcoes.voz = !opcoes.voz; break;
      case 'precisao':
        opcoes.precisao = proximo(['normal', 'alta'], opcoes.precisao);
        salvarOpcoes();
        location.reload();
        return;
      case 'pesos': return app.trocar('peso', { perfis: app.historico.perfis.map((p) => p.id), depois: 'opcoes' });
      case 'musica':
        if (app.audio.arquivo) app.audio.usarArquivo(null);
        else {
          this.mensagem = 'ESCOLHA O ARQUIVO COM O MOUSE.';
          this.arquivoMusica.click();
        }
        break;
      case 'bpm': {
        const lista = [];
        for (let v = 96; v <= 140; v += 2) lista.push(v);
        opcoes.bpmProprio = proximo(lista, opcoes.bpmProprio);
        break;
      }
      case 'exportar': {
        const d = new Date();
        const nome = `pumpitgym-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([app.historico.exportar()], { type: 'application/json' }));
        a.download = nome;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        this.mensagem = `BACKUP GRAVADO: ${nome.toUpperCase()}`;
        break;
      }
      case 'importar':
        this.mensagem = 'ESCOLHA O ARQUIVO COM O MOUSE.';
        this.arquivoDados.click();
        break;
    }
    salvarOpcoes();
    this.rotular();
    // a mão pode ficar no botão para trocar de novo
    for (const j of app.entrada.j) if (j.cursor.alvo === b) j.cursor.desde = app.t;
  }

  desenhar(c) {
    this.app.fundo(0.6);
    texto(c, 'OPÇÕES', LARGURA / 2, 58, { tam: 46, cor: CORES.amarelo, fonte: 'Audiowide', peso: 400 });
    this.menu.desenhar(c, this.app);
    texto(c, this.mensagem || 'OS DADOS FICAM SÓ NESTE NAVEGADOR. FAÇA UM BACKUP DE VEZ EM QUANDO.', LARGURA / 2, 692, { tam: 16, cor: this.mensagem ? CORES.amarelo : '#b9a8dd', brilho: 0, peso: 500, largura: LARGURA - 80 });
  }
}
