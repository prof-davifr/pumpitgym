# pumpitgym

Treino de pernas e dança em casa, com cara de anos 80, controlado pelo corpo com a webcam.
Para três perfis: Ânimo, Foco e Força. Sem equipamento: só o peso do corpo (e uma cadeira firme no teste de 30 s).

A câmera lê os movimentos e conta as repetições. Os menus funcionam com a mão: levante a mão,
leve o cursor até o botão e espere o botão encher. Uma ou duas pessoas treinam ao mesmo tempo.

A imagem da câmera é processada no próprio navegador e não sai do aparelho.

## Como abrir

No navegador (Chrome, Edge, Firefox ou Safari recentes): abra o link público do app e libere a câmera.

No computador de casa, em tela cheia:

```bash
./iniciar.sh
```

O script sobe um servidor local na porta 8770 e abre o Chrome. Para abrir à mão:
`python3 ferramentas/servidor.py 8770` e depois `http://localhost:8770`.

Os dados ficam no navegador e valem para um endereço: o link público e o `localhost` têm
históricos separados. Use EXPORTAR e IMPORTAR (em OPÇÕES) para levar os dados de um para o outro.

## Dicas para a câmera

- Corpo inteiro na imagem, de 2 a 3 metros da câmera, com luz de frente.
- Câmera mais ou menos na altura do quadril.
- Duas pessoas: lado a lado, com espaço para os dois abrirem os braços. Quem escolheu primeiro fica à esquerda.
  Se as duas chegam perto demais, o tempo para e o app pede para afastar.
- Se ninguém está na frente da câmera, o tempo para sozinho.

## Atividades

| Atividade | O que é |
|---|---|
| Treino do dia | Aquecimento, circuito de pernas e aeróbico (40 s de exercício, 20 s de descanso), dança e volta à calma. De 1 a 3 voltas. Os exercícios de impacto mudam com o dia. |
| Dança | Imite a pose amarela no tempo da música. Passos de baixo impacto, sem pulo e sem giro. |
| Desafio das pernas | O máximo de agachamentos em 60 s. Guarda o recorde. |
| Teste de 30 s | Sentar e levantar de uma cadeira por 30 s. Repita uma vez por mês para ver a evolução da força das pernas. |
| Evolução | Calorias por dia, totais, recordes e as últimas sessões de cada pessoa, com dia e hora. |

### Exercícios

| Exercício | Como a câmera lê |
|---|---|
| Agachamento, agachamento parcial, sentar e levantar | O quadril desce e sobe. Mede a profundidade e os tempos de descida e de subida |
| Agachamento parado | Agachado e parado (conta segundos) |
| Afundo | O quadril desce com uma perna à frente e a outra atrás |
| Ponta dos pés | O corpo sobe devagar e desce |
| Perna para o lado | Um tornozelo se afasta do corpo e volta |
| Marcha, corrida no lugar | Um joelho ou pé acima do outro, alternando |
| Polichinelo, polichinelo sem pulo | Os pulsos sobem acima dos ombros |
| Agachamento com salto | O quadril sobe rápido |
| Salto lateral | O quadril vai de um lado para o outro |
| Ponte (opcional) | Deitado de costas e de lado para a câmera: o quadril sobe |

## Perfil de baixo impacto

O perfil Ânimo é de baixo impacto, com estas regras em todas as atividades:

- **Sem impacto e sem giro**: nenhum salto. No lugar deles entram o polichinelo sem pulo, a marcha,
  a perna para o lado e a ponta dos pés. Se a câmera vê um pulo, o app avisa SEM PULAR.
- **Agachamento parcial**: a repetição conta com o joelho perto de 60° e o app avisa DESÇA MENOS
  quando a descida passa do limite (30 % do comprimento da perna, que é perto de 90° de joelho).
  O limite muda em OPÇÕES.
- **Descida lenta**: o app avisa MAIS DEVAGAR quando a descida dura menos de 1 segundo.
- **Sem afundo**.

O app não substitui a orientação de um profissional de saúde, e qualquer dor é motivo para parar.

## Base científica

- **Estrutura do treino** (aquecimento, parte principal, volta à calma; força de pernas e aeróbico):
  Garber et al., *Quantity and quality of exercise for developing and maintaining cardiorespiratory,
  musculoskeletal, and neuromotor fitness in apparently healthy adults*, Med Sci Sports Exerc, 2011 (posição do ACSM).
- **Calorias**: `kcal/min = MET × 3,5 × peso (kg) / 200` (ACSM), com o MET da categoria de cada exercício no
  Compêndio de Atividades Físicas (Ainsworth et al., Med Sci Sports Exerc, 2011). Parado, vale o repouso em pé (1,3 MET).
  É uma estimativa: serve para comparar sessões, não é uma medida.
- **Fadiga**: perda de velocidade na subida da repetição em relação às melhores do bloco
  (Sánchez-Medina e González-Badillo, *Velocity loss as an indicator of neuromuscular fatigue during
  resistance training*, Med Sci Sports Exerc, 2011). O app também olha a perda de amplitude e a queda do ritmo.
  20 % de perda: aviso para diminuir. 30 %: aviso para parar e respirar.
- **Esforço percebido**: escala de Borg CR10 (Borg, 1982), perguntada no fim de cada sessão.
- **Teste de sentar e levantar em 30 s**: Rikli e Jones, *Development and validation of a functional
  fitness test for community-residing older adults*, J Aging Phys Act, 1999.
- **Baixo impacto e agachamento parcial**: a carga no joelho cresce com a flexão profunda e com a rotação,
  e por isso o perfil de baixo impacto limita a profundidade e tira os giros e os saltos.

Os valores de MET de cada exercício e a referência de cada um estão em `js/treino/exercicios.js`.

## Música

A trilha do app é original, feita na hora pelo navegador (124 batidas por minuto).
Para treinar com outra música, por exemplo uma cópia sua de "Pump It Up", use OPÇÕES → MINHA MÚSICA,
escolha o arquivo no aparelho e ajuste as batidas por minuto. O arquivo não é enviado a lugar nenhum.

## Dados

Tudo fica no `localStorage` do navegador (`pumpitgym-v1`): o peso e os limites de cada pessoa e as sessões
(dia e hora, tempo ativo, calorias, repetições de cada bloco, índice de fadiga e esforço percebido).
EXPORTAR baixa um arquivo `pumpitgym-AAAA-MM-DD.json`; IMPORTAR junta um arquivo desses sem duplicar sessões.

## Teclado e mouse

O mouse clica nos botões. No teclado: setas escolhem, Enter confirma, Esc volta (ou pausa a sessão).

## Opinião de quem joga

Uma vez por visita (depois de 4 minutos de treino, na volta do resultado ao menu), o jogo pergunta "gostou?"
com três rostos e mostra um QR code do Google Forms do jogo, para quem quiser escrever mais.
Segure a mão sobre um rosto para votar (ou setas e Enter, ou o mouse). "Agora não" pula, e o jogo segue sozinho depois de 30 segundos.
Depois de perguntar, só pergunta de novo no outro dia.

O voto vai para o formulário com a versão publicada, o tempo de jogo e onde a pessoa estava
(atividade e número de pessoas). Não vai nome, imagem da câmera nem nada pessoal.
Sem internet, o voto espera no navegador e sai na próxima vez que o jogo abrir.

O formulário e os nomes dos campos ficam em `OPINIAO`, em `js/config.js`; vazio, o jogo não pergunta.
O código fica em `js/motor/opiniao.js` (igual em todos os jogos da série) e `js/cenas/opiniao.js`.
`?opiniao=1` pergunta já na primeira volta; `?opiniao=exemplo` usa um formulário de mentira, sem enviar nada;
`?opiniao=0` desliga. O robô (`?robo=1`) e o navegador dos testes automáticos não perguntam.

## Desenvolvimento

```bash
npm test                 # testes da leitura dos movimentos, do treino e do histórico (Node, sem navegador)
```

- `?robo=1` troca a câmera por duas pessoas sintéticas que fazem os exercícios.
- `?passos=N` roda N passos por quadro, para uma sessão inteira passar depressa nos testes.

```
index.html, css/          página e estilo
js/main.js                laço principal e troca de cenas
js/config.js              limiares dos movimentos, cores e opções
js/motor/                 câmera e pose (camera-pose.js), leitura do corpo (corpo.js), cursor da mão,
                          espaço entre duas pessoas, fadiga, poses sintéticas
js/treino/                exercícios, perfis, planos, sessão, dança, avisos de segurança
js/dados/historico.js     perfis e sessões no navegador, exportar e importar
js/cenas/                 telas
js/arte/, js/som/         desenho neon e som
vendor/                   detecção de pose (MediaPipe Tasks Vision) e fontes (Audiowide e Orbitron, licença OFL)
```
