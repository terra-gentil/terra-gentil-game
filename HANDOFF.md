# HANDOFF — Terra Gentil Game

> Documento de transferencia de contexto pra retomar o projeto em um novo
> chat sem perder nada. Atualize este arquivo a cada sprint que fechar.

**Ultima atualizacao**: 2026-05-04 (smoke automatizado migrado de routine Claude pra GitHub Actions, primeiro run verde)
**HEAD atual**: ver `git log --oneline -1` (HANDOFF nao se auto-atualiza com proprio hash)
**Sprints concluidas**: G0..G8 + G7.5 (todas com QA round-4 aplicado)
**Repo**: https://github.com/terra-gentil/terra-gentil-game (publico)
**Deploy frontend**: https://terra-gentil.github.io/terra-gentil-game/ (GitHub Pages, deploy automatico no push pra main)
**Deploy backend**: https://terra-gentil-game-production.up.railway.app (Railway, deploy automatico no push pra main quando `backend/**` muda)
**Local**: `C:\Gitlab_hz\terra-gentil-game\`

---

## Como retomar em um novo chat

Cole o seguinte como primeira mensagem:

```
Continuando o projeto Terra Gentil Game. Le HANDOFF.md primeiro pra contexto.
Depois disso, [meu objetivo aqui — ex: "vamos pra G7", ou "rodar mais 1 round
de QAs", ou "testei e o D-pad esta sumindo em mobile, ajuda a debugar"].
```

O Claude deve:
1. Ler `HANDOFF.md` (este arquivo)
2. Olhar git log mais recente: `git log --oneline -10`
3. Listar tasks abertas se houver
4. Ler ultimo handoff de QA relevante em `qa/g{N}/pass-{NN}/handoff.md`

### Estado pos-sessao 2026-05-04 (continuacao mesmo dia)

- HEAD `c1bd7f5` em `main`, pushada (workflow smoke diario)
- Smoke test automatizado **agora roda via GitHub Actions** (`.github/workflows/smoke.yml`), cron `0 12 * * *` (9h BRT). Primeiro run via `workflow_dispatch` em 2026-05-04 23:16Z passou 6/6 (run id 25348753277). Falhas mandam email automatico pra eng.andrehz@gmail.com.
- Routine Claude `trig_019Zm6vSMop98mBXaJhTyfdu` foi criada e disabled — sandbox do Anthropic Cloud bloqueia outbound HTTP pra Railway com `host_not_allowed` (allowlist de plataforma, nao configuravel pelo usuario). Por isso a routine antiga `trig_01QM...` tambem ia falhar mesmo com GitHub access OK
- Smoke test manual rodado em prod antes da migracao, 6/6 curls verdes (validou rounds 4/5/6)
- Branch `g6.5-audio-prep` (commit `dace5e1`) pushada, NAO mergeada — espera Andre dropar OGGs do FamiStudio em `jogo/public/assets/audio/` e virar `USE_OGG_SFX=true` em `Constants.ts`
- 0 P1 abertos. 13 P2 fechados nos 3 rounds. ~10 P2 abertos sao trade-offs aceitos
- 34 tests automatizados (22/22 pytest backend, 12/12 vitest frontend) + smoke diario
- Banco prod: 5 scores residuais (DIAG, PERSIST, SMOKE18500, SMOKE6017, SMOKE231625) — vao ser empurrados pra baixo conforme jogadores reais postarem
- Bloqueios em Andre: G9 (direcao de arte) e G6.5 (FamiStudio + OGGs)

### Estado pos-sessao 2026-04-30 (sessao anterior)

- HEAD `d273b48` em `main`, pushada
- 0 P1 abertos, 13 P2 fechados, smoke automatizado falhou em rodar (auto-disabled)

### Caminhos possiveis no proximo chat (em ordem de prio)

1. **G9 visual** se Andre tiver direcao de arte (estilo, referencia, sprite Gentileza, tilemap real)
2. **G6.5 audio** se Andre tiver OGGs prontos: dropar em `jogo/public/assets/audio/`, mudar `USE_OGG_SFX=true`, mergear branch `g6.5-audio-prep`
3. **Round-7 QA**: rodar 1 sub-agente novo cobrindo round-5 + round-6 (sprints novas? nao — so qa-fixes, talvez 1 sub-agente cirurgico)
4. **G10 lancamento**: remover `console.log` (trade-off #6), polish final, divulgacao
5. **Backlog P2 restante** (baixo ganho): P2-G7-04 connection pool, P2-G8-02 documentar time_seconds inclui retries, P2-G7.5-01/02/03 documentar contratos URL param

---

## O que o projeto e

Subprojeto 1.2 do app Terra Gentil. Jogo web pixel-art do mascote
**Gentileza** (marca registrada Terra Gentil, classes 28 e 41 INPI).
Inspirado no **Lawn Mower NES** (Shiru, 2011, Dominio Publico).
Publico-alvo: 40-70 anos, mobile-first em landscape.

Nao copia nenhum bit do codigo ASM original — todo o codigo TypeScript
em `jogo/` foi escrito do zero usando Phaser 3, baseado em engenharia
reversa documentada em `pesquisa/analise/`.

---

## Stack

- **Phaser 3.90** (NAO Phaser 4 — instalado explicitamente com `phaser@^3.80.0`)
- **TypeScript** ~6.0.2 (strict mode)
- **Vite** 8.0.10 (vite.config.ts com base path condicional: `'/terra-gentil-game/'` em build, `'./'` em dev)
- **Node.js** v18+ (CI usa Node 20, com `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env pra opt-in)
- **Deploy**: GitHub Actions -> GitHub Pages (artifact + deploy-pages action oficial)
- **Backend ranking** (G7): FastAPI 0.115 + Pydantic 2.9 + slowapi 0.1.9 + SQLite stdlib, Python 3.12-slim no Docker, em prod no Railway com volume persistente em `/data`

---

## Estrutura de diretorios

```
terra-gentil-game/
├─ HANDOFF.md                       <- este arquivo
├─ README.md                        <- status checklist e creditos
├─ COMO_RODAR.md                    <- comandos pra dev/build local
├─ LICENSE                          <- MIT + atribuicao Shiru
├─ .gitignore                       <- ignora pesquisa/lawn-mower-original/, node_modules, dist
│
├─ .github/workflows/
│  └─ deploy.yml                    <- CI: build + deploy automatico no push pra main
│
├─ pesquisa/                        <- engenharia reversa do Lawn Mower NES
│  ├─ lawn-mower-original/          <- repo do Shiru (gitignored, nao versionado)
│  └─ analise/
│     ├─ ANALISE_LAWN_MOWER.md     <- relatorio principal (11 secoes)
│     ├─ 01_mapeamento.txt
│     ├─ 02_estrutura_codigo.md
│     ├─ 03_editor.md
│     ├─ 04_scroll_e_fases.md
│     ├─ extract_chr.py             <- decodifica patterns.chr em PNG
│     ├─ extract_palette.py         <- parse palette.asm
│     ├─ extract_levels.py          <- decodifica levels.bin e patterns.chr offset 4096
│     └─ assets-extraidos/
│        ├─ patterns_grayscale.png  <- 512 tiles 8x8 NES, paleta cinza
│        ├─ patterns_lawn.png       <- mesmo tileset, paleta verde
│        ├─ palettes.json           <- 4 paletas nomeadas + 10 variantes por nivel
│        ├─ fases_editor.json       <- 10 fases formato fonte (autoritativo)
│        ├─ fases_runtime.json      <- 10 fases formato CHR runtime
│        └─ fase_01.json            <- so a fase 1 (mantido pra referencia)
│
├─ jogo/                            <- codigo do jogo
│  ├─ index.html                    <- viewport mobile, lock landscape, no-zoom
│  ├─ package.json                  <- phaser ^3.90, vite ^8.0, tsc ~6.0
│  ├─ tsconfig.json                 <- strict, ES2020, bundler resolution
│  ├─ vite.config.ts                <- base condicional, host: true (acesso LAN)
│  ├─ public/
│  │  └─ assets/
│  │     ├─ maps/niveis.json        <- copia de fases_editor.json (10 niveis)
│  │     ├─ sprites/                <- vazio (G9)
│  │     └─ audio/                  <- vazio (G6.5: OGG do FamiStudio)
│  └─ src/
│     ├─ main.ts                    <- entry point, instancia Phaser.Game
│     ├─ config/
│     │  ├─ Constants.ts            <- consts globais isoladas (1280x720, TILE_SIZE=64, COLORS, RANKING_API_URL)
│     │  ├─ GameConfig.ts           <- monta config Phaser, registra scenes, re-exporta Constants
│     │  └─ Settings.ts             <- localStorage: eyeStrainMode, soundEnabled
│     ├─ types/
│     │  ├─ Level.ts                <- LevelJson, AllLevelsJson, TILE consts
│     │  └─ Ranking.ts              <- ScoreCreate, ScoreOut, TopResponse, NICKNAME_REGEX
│     ├─ api/
│     │  └─ RankingApi.ts           <- fetch wrapper, RankingApiError com kinds
│     ├─ state/
│     │  └─ RunStats.ts             <- tracking de cuts/level/time, modo pratica, cache de nickname
│     ├─ ui/
│     │  └─ SubmitModal.ts          <- modal HTML overlay com input de nickname
│     ├─ audio/
│     │  └─ SfxPlayer.ts            <- 6 SFX sintetizados Web Audio API
│     └─ scenes/
│        ├─ BootScene.ts            <- preload niveis.json
│        ├─ TitleScene.ts           <- titulo + JOGAR + selector 1-10 + 2 toggles + botao RANKING
│        ├─ GameScene.ts            <- engine + render + camera + game loop + D-pad + dispara modal
│        └─ RankingScene.ts         <- tela do top 50 com retry em erro
│
└─ qa/                              <- relatorios de QA por sub-agentes Sonnet
   ├─ README.md                     <- estrutura e politica
   ├─ g0/pass-{01..03}/{relatorio,handoff}.md
   ├─ g1/pass-{01..03}/...
   ├─ g2/pass-{01..03}/...
   ├─ g3/pass-{01..03}/...
   ├─ g4/pass-{01,02}/...
   ├─ g5/pass-{01,02}/...
   └─ g6/pass-01/...
```

---

## Status das sprints

- [x] **G0** — Engenharia reversa do Lawn Mower NES + scaffolding Phaser
- [x] **G1** — Setup repo GitHub publico + deploy automatico via Actions
- [x] **G2** — Engine core (carrega fase_01, render real, snap-to-grid, corte por tipo)
- [x] **G3** — Camera scroll horizontal + carrega 10 niveis + auto-progressao
- [x] **G4** — Game loop completo (combustivel, penalty flores/pedra, galao, game over)
- [x] **G5** — Mobile (D-pad virtual + modo olhos cansados com persistencia)
- [x] **G6** — Audio (SFX sintetizado via Web Audio API + toggle de som)
- [ ] **G6.5** — (futuro) Substituir SFX sintetizado por OGG real exportado das musicas/efeitos originais via FamiStudio
- [x] **G7** — Backend ranking (FastAPI + SQLite, deploy Railway validado em prod, sem QA ainda)
- [x] **G7.5** — WebView no app Terra Gentil (GameScreen com landscape lock + nickname via URL param)
- [x] **G8** — Frontend ranking (modal de submit + tela de top 50 + cache de nickname)
- [ ] **G9** — Visual final (sprite Gentileza pelo design, tilemap real)
- [ ] **G10** — Lancamento

---

## Git log das sprints

```
c1bd7f5 ci: smoke test diario backend prod (substitui routine Claude que sandbox bloqueia)
3ef7edd handoff: pos-hotfix P1-G7-02 + smoke 6 curls validado em prod
1290ddd fix: hotfix P1-G7-02 - prod 502 por permissao em /data
afdb107 handoff: fim de sessao 2026-04-30 + estado pos-pausa de 4 dias
d273b48 handoff: atualiza pos qa-fixes round-5 e round-6
467efb2 qa-fixes round-6: 9 P2 (backend hardening + frontend polish)
79806d9 qa-fixes round-5: P2 polish + docs + tests Vitest
f12c293 handoff: atualiza pos-QA round-4 e qa-fixes round-4
ef0ac6a qa-fixes round-4: aplica 8 P1 do QA round-4
c13b9fa qa: round-4 reports - G0..G8 (10 sub-agentes Sonnet)
ad71970 G7.5: WebView no app + nickname via URL param
6f3b89a handoff: atualiza git log e instrucao do HEAD
67b06cd G8: frontend ranking - submit modal, tela de top 50 e cache de nickname
a03405c G7: deploy Railway concluido + HANDOFF atualizado com URL prod
bc810e6 handoff: atualiza pos-G7 e nova politica de QA on-demand
9d87925 G7: backend de ranking FastAPI + SQLite (deploy pendente)
865d9a9 handoff: documento de transferencia de contexto pra retomar projeto em novo chat
67bb45f qa-fixes round-3: AudioNode disconnect, prime context, audio dissonance
aa2633a G6: SFX sintetizado via Web Audio API + toggle de som
a67a26b qa-fixes round-2: G4 cleanup, G5 depth/dpad, docs
8662a4a G5: marca checklist completo no README
d484e11 G5: D-pad virtual + modo olhos cansados (acessibilidade)
49db09a qa-fixes G0: parser de paletas, fuel_inc round->int, docs
5bcf397 qa-fixes: aplicar achados P1/P2 das QAs G1/G2/G3
7d2993c G4: game loop completo - combustivel, penalty, galao, game over
caa959c G3: 10 fases + camera scroll horizontal + auto-progressao
c1a9b6a G2: engine core - carrega fase_01, render real, snap-to-grid, corte por tipo
a7db08a fix: HUD chega em 100% no placeholder
c1c1e48 G1: opt-in Node 24 nas actions
5fc6645 G1: workflow de deploy GitHub Pages + ajuste base path
18d8f27 G0+: adiciona LICENSE MIT e reforca atribuicao ao Shiru
2dfab0d G0: engenharia reversa do Lawn Mower NES + scaffolding Phaser 3
```

---

## Decisoes arquiteturais importantes

### Phaser 3, nao 4
`npm install phaser` instala v4 por padrao. Forcamos `phaser@^3.80.0`
(resolveu pra 3.90) porque o brief especifica 3 e o ecossistema/docs
ainda sao majoritariamente 3.

### Tile size 64x64 (4x do NES)
NES original usa metatile 16x16 px (4 tiles 8x8). Multiplicamos por 4
pra ficar legivel pro publico 40-70. Resolucao 1280x720 = 20 tiles
horizontais x 11.25 verticais.

### Resolucao base 1280x720 com Scale.FIT
`Phaser.Scale.FIT` + `CENTER_BOTH`. O canvas reescala mantendo aspect
ratio em qualquer tela. CSS adicional em `index.html` faz lock paisagem
em mobile (warning de orientacao em portrait).

### Spawn do jogador usa `editor_x` / `editor_y` direto
NAO `game_x` / `game_y` (que tem offset +1,+3 das bordas do NES original).
Como o port nao tem bordas no grid, as coordenadas do editor se aplicam
direto. Confirmado: tile em (editor_x, editor_y) e sempre `0` (cut) nas
10 fases.

### Movimento snap-to-grid
- Player tem `dir` (atual) e `pendingDir` (queued)
- Move continuamente em 1 eixo so
- `pendingDir` so e aplicado ao chegar no centro do proximo tile
- Trava em `dir = 'NONE'` ao bater na parede (precisa novo input)
- `dt` capado em 50ms pra proteger snap em lag spikes
- Fiel ao comportamento do Lawn Mower original

### STONE nao bloqueia, so penaliza
Mesma logica do NES (`game.dasm:1878`). Player passa por cima da pedra,
toma -25 fuel + camera shake. Re-entrar na mesma pedra repete penalty
(o tile nunca vira CUT) — verificado fiel ao original via QA G2.

### FLOWERS one-shot
Diferente do original que tem estado intermediario `$13` "flores
cortadas". Simplificacao consciente: pisou na flor uma vez, tile vira
CUT, sem penalty na re-passagem. Documentado em QA G0 pass-02 como
desvio aceito pra clareza visual.

### SFX sintetizado, nao asset OGG (por enquanto)
G6 usa Web Audio API com OscillatorNode pra gerar SFX. Sem dependencia
de assets. Plano G6.5: substituir por OGG exportado dos `.ftm` originais
do Shiru via FamiStudio (free, https://famistudio.org). Trocar `sfx.cut()`
por `this.sound.play('cut')` no Phaser. **A licenca permite** porque
o Lawn Mower NES e Dominio Publico.

### Settings via localStorage
`gentileza:settings` key. Atualmente: `eyeStrainMode` e `soundEnabled`.
Toggle no TitleScene persiste e re-aplica em cada `init()` da GameScene.
Mudancas no Title NAO refletem em GameScene em curso (so na proxima entrada).

### Camera horizontal-only
Scroll vertical nao existe (mesmo do original). `setBounds(0, 0,
max(worldW, GAME_WIDTH), GAME_HEIGHT)` + `startFollow(player, false,
0.1, 0)`. Sem offsetX hardcoded (pegada do QA G3 pass-01).

### Constantes em arquivo isolado (Constants.ts)
Pra evitar dependencia circular: `GameConfig.ts` importa as scenes pra montar
o config Phaser, e as scenes precisam das constantes (GAME_WIDTH, COLORS, etc.).
Se as constantes morassem em `GameConfig.ts`, as scenes importariam GameConfig
fechando o ciclo, e dependendo da ordem de avaliacao ESM as constantes ficavam
em TDZ no momento de uso (`COLORS` nao acessivel antes de inicializar). G8
quebrou tudo na hora que adicionou RankingScene mudando ordem dos imports.
Solucao: `Constants.ts` so com constantes (zero imports de scenes), scenes
importam direto de Constants. `GameConfig.ts` re-exporta tudo pra compat de
imports legados.

### Stats de run vivem fora da scene
`state/RunStats.ts` mantem `cutsByLevel`, `highestLevel`, `startTimeMs`,
`practiceMode` em modulo singleton (nao no `Phaser.registry` — Phaser destroi
registry no Game.destroy mas o singleton sobrevive a `scene.start()`).
- `startRun({ practiceMode, startLevelIndex })` resetta tudo. Chamado so do
  TitleScene em JOGAR (practice false) ou em selector 1-10 (practice true).
- `enterLevel(idx)` no `create()` da GameScene atualiza `highestLevel`.
- `recordCut(idx)` em cada `cutTileAt`.
- `endRun()` quando submit OK, win+pulou, ou Esc pro Title.
- `isRankingEligible()` controla se modal aparece (false em practice mode).

### Modal de submit e HTML overlay, nao Phaser
`ui/SubmitModal.ts` cria div absoluto no `<body>` com input nativo. Razao:
mobile aciona teclado virtual do OS sem custo, e Phaser nao tem widget de
input nativo. Estilo CSS fica em `index.html` (`.submit-modal-card` etc).
Flag `submitModalOpen` na GameScene bloqueia handlers de pointer/keyboard
enquanto o modal estiver aberto pra evitar input duplo no canvas.

### Nickname valido: regex [A-Z0-9_]{3,12}
Espelha exatamente o regex do backend (`models.py:ScoreCreate.nickname`).
Validacao client-side em tempo real (botao ENVIAR fica desabilitado se
invalido). Auto-uppercase no input. Cache em `localStorage["gentileza:nickname"]`
sobrevive entre sessoes.

### Backend rejeita pct=100 com level<10
Constraint do backend (`validation.py`). `buildSubmitPayload` clampa pct pra
99 quando highest<10 pra nao quebrar submit de quem chegou perto mas nao
zerou. Quem zerou (level=10) pode mandar 100 normal.

### D-pad sempre visivel
4 botoes bottom-left, depth 2000 (rectangle) + 2001 (arrow). Filtra
pointerdown global via `currentlyOver.length > 0` pra nao duplicar
input com tap-to-move. Centro do D-pad calculado dinamicamente pra
manter margem 20px do bottom em ambos os modos visuais.

### Center messages em depth 2002
Acima do D-pad pra nao ser obstruidas em level clear / game over.

---

## Convencoes pra trabalho com este projeto

### Linguagem
- **PT-BR em commits, docs, codigo de UI** (textos visiveis)
- Identifiers em ingles (variaveis, funcoes, tipos) — exceto se contexto pede PT-BR (ex: `LevelJson` campos com nomes em PT)
- **Sem travessao** (em-dash `—` ou en-dash `–`) em texto gerado — usar hifen simples

### Commits
- Mensagens em PT-BR
- Comecam com `G{N}:` ou `qa-fixes round-{N}:` ou `fix:` ou similar
- Se mensagem for longa OU contiver aspas, usar arquivo:
  ```
  Write .git_commit_msg
  git commit -F .git_commit_msg
  Remove-Item .git_commit_msg
  ```
- Heredoc PowerShell `@'...'@` quebra com aspas no meio. Usa `-F` em mensagens com aspas.
- Co-author do Claude omitido (nao mencionar emoji ou ferramenta)

### Tasks
- TaskCreate / TaskUpdate / TaskList sao usados pra rastrear progresso
- Cada sprint cria tasks G{N}.1, G{N}.2 etc

### QAs
- **Politica**: cada sprint nova lanca 1 round de QA pra TODAS as sprints existentes
- 6 sub-agentes Sonnet em paralelo (ou 7 com novo sprint)
- Cada sub-agente le `qa/g{N}/pass-{anterior}/handoff.md` antes de comecar
- Output: `qa/g{N}/pass-{NN}/{relatorio,handoff}.md`
- Severidade: P0 (bloqueante) / P1 (serio) / P2 (moderado) / P3 (cosmetico)
- Cada finding cita `arquivo:linha`
- Reviewers usam `git show <hash>:<path>` pra ler em commits especificos (nao working tree)
- Apos round de QA, fazemos commit "qa-fixes round-{N}" aplicando os P1/P2 validos

### Shell
- Ambiente: Windows + bash + PowerShell
- Default e bash mas PowerShell esta disponivel (Tool: PowerShell)
- Nao usar `2>&1` em comandos nativos no PowerShell (wrappa stderr como erro)
- Usar PowerShell.exe (5.1) — sem operadores `??`, `?:`, `?.`
- Caminhos: barras invertidas em PowerShell, barras normais em bash

### CI
- Workflow `.github/workflows/deploy.yml`
- Trigger: push em main com paths `jogo/**` ou o proprio yml
- Permissions minimas: `contents: read` no top-level, `pages: write` + `id-token: write` so no job deploy
- Actions pinadas em `@v4`/`@v3` (tradeoff aceito sem SHA pin enquanto nao houver Dependabot)
- Concurrency `group: pages, cancel-in-progress: true`

### Build
- `cd jogo && npm run build` produz `dist/` com base path `/terra-gentil-game/`
- Bundle atual: ~325 KB gzip (Phaser 3 todo embutido)

---

## Trade-offs aceitos (NAO fixar a menos que mude contexto)

1. **STONE re-penalty repetida** — fiel ao NES original, intencional
2. **FLOWERS one-shot** — desvio do original pra clareza visual
3. **Actions @v4 sem SHA pin** — aceito enquanto nao houver Dependabot configurado
4. **AudioContext sem `.close()`** — leak entre sessoes minimo
5. **Tween de alpha em startButton nao para no scene.start** — cosmetico
6. **`console.log` em producao** — util pra debug agora, removivel em G10
7. **`fuel_inc_por_tile_8_8` dead field no JSON** — mantido pra uso futuro
8. **Toggle de Settings nao reflete em GameScene em curso** — UX aceitavel
9. **D-pad sobrepoe colunas 0-2 em fases pequenas (1-3)** — alpha 0.55 deixa ver atraves
10. **Volumes de SFX nao tem slider** — so on/off
11. **time_seconds inclui retries de fase** (G8 P2-G8-02) — ranking conta tempo total da run, nao percurso bem-sucedido. Documenta penalidade pra mortes
12. **conftest.py usa importlib.reload** (G7 P1-03) — factory pattern e o fix definitivo, deferred. Mitigado com tempfile + limiter reset + cleanup robusto
13. **URL `?nickname=` sobrescreve cache local** (G7.5 P2-01) — comportamento documentado. WebView tem prioridade sobre nickname digitado. Cenario tablet compartilhado aceita esse trade-off
14. **`RANKING_API_URL` hardcoded** (G8 P3-01) — pragmatico, sem env vars Vite

---

## Trabalho que precisa de acao manual do usuario

### Bloqueantes pra G6.5 (audio real)
1. **Instalar FamiStudio** (https://famistudio.org)
2. Abrir `pesquisa/lawn-mower-original/sound/lawn_mower.ftm` e exportar cada track em OGG
3. Abrir `pesquisa/lawn-mower-original/sound/sounds.ftm` e exportar cada SFX em OGG
4. Dropar arquivos em `jogo/public/assets/audio/{nome}.ogg`
5. Avisar Claude pra trocar `sfx.*()` por `this.sound.play(key)`

### G7 deploy (CONCLUIDO 2026-04-30)
Decisoes ja tomadas:
- Schema: `nickname` [A-Z0-9_]{3,12}, `level_reached` 1-10, `total_pct` 0-100, `time_seconds` 1-36000. Zero PII.
- Top-N: 50 (configuravel via query param ate 100)
- Retencao: forever inicial
- CORS: `https://terra-gentil.github.io` + `http://localhost:5173`
- Rate limit: 5/min POST, 60/min GET
- Anti-abuse: tempo minimo 3s/level + pct 100 so com level 10

Setup feito no Railway (projeto `powerful-mercy`):
- Servico `terra-gentil-game` apontando pra `terra-gentil/terra-gentil-game` repo, branch `main`
- Root Directory = `/backend`, Dockerfile path = `/backend/Dockerfile`
- Volume `terra-gentil-game-volume` montado em `/data`, 500 MB
- Env vars: `DB_PATH=/data/scores.db`, `CORS_ORIGINS=https://terra-gentil.github.io,http://localhost:5173`
- Auto-deploy ativo no push pra `main`
- URL publica: `https://terra-gentil-game-production.up.railway.app`

Smoke test validado em 2026-04-30:
- `GET /health` -> 200
- `POST /scores` -> 201 com id sequencial
- `GET /scores/top` -> 200 com ordering correto
- Persistencia confirmada via Restart no painel Railway (scores sobrevivem)

Banco prod tem 2 scores de teste residuais (DIAG, PERSIST) que vao ser empurrados pra baixo do ranking conforme jogadores reais postarem. Decisao: deixar la (baixo dano).

### Pendentes pra G9 (visual final)
1. Sprite real do mascote Gentileza (atualmente e retangulo amarelo com borda laranja)
2. Tilemap pixel-art real (atualmente sao retangulos coloridos)
3. Direcao de arte definitiva (qual estilo? referencia)

---

## Contratos / invariantes (resumido das QAs)

### Formato `niveis.json` (e cada `LevelJson`)
```typescript
{
  id: number,                     // 1..10
  largura_efetiva_tiles: number,  // 14, 20, 25 ou 30
  altura_tiles: 11,               // FIXO
  spawn_jogador: { editor_x, editor_y, game_x, game_y },
  grama_alta_para_cortar: number, // count tiles==1
  fuel_inc_por_tile_8_8: number,  // unused no port (use grama_alta_para_cortar)
  tiles: number[][]               // [row][col], 0..3 = cut/tall/flowers/stone
}
```

### Tile codes (mapeamento 2-bit -> semantico)
- 0 = `TILE.CUT` = grama cortada (chao, nao conta pro target)
- 1 = `TILE.TALL` = grama alta (alvo de corte)
- 2 = `TILE.FLOWERS` = flores (penalty -12 fuel, vira CUT)
- 3 = `TILE.STONE` = pedra (penalty -25 fuel, mantem STONE, camera shake)

### Constantes de game balance (em `GameScene.ts`)
- `FUEL_MAX = 100`
- `FUEL_DECAY_INTERVAL_MS = 500` (1 ponto a cada 500ms quando movendo)
- `PENALTY_FLOWERS = 12`
- `PENALTY_STONE = 25`
- `FUEL_SPAWN_MS = [10000, 9000, 8000, 7000, 6500, 6000, 5500, 5500, 5500, 5500]` (por nivel)
- Speed do player: `240 px/s`

### Larguras das fases (em tiles)
- Fases 1-3: 14
- Fases 4-5: 20
- Fases 6-8: 25
- Fases 9-10: 30

### Spawn por fase (game coords / editor coords)
| Fase | Spawn (editor_x, editor_y) |
|------|---------------------------|
| 1    | (6, 5) |
| 2    | (6, 5) |
| 3    | (6, 5) |
| 4    | (5, 5) |
| 5    | (2, 5) |
| 6    | (12, 5) |
| 7    | (2, 5) |
| 8    | (2, 5) |
| 9    | (14, 5) |
| 10   | (14, 5) |

### Depth ordering
- Tiles do mapa: default (0)
- Fuel barrel: 5
- Player: 10
- HUD background: 999
- HUD text + fuel bar: 1000-1002
- D-pad rectangles: 2000
- D-pad arrow texts: 2001
- Center messages (level clear / game over): 2002

### Camera
- Bounds: `(0, 0, max(worldW, GAME_WIDTH), GAME_HEIGHT)`
- Follow: `startFollow(player, false, 0.1, 0)` (lerpX 0.1, lerpY 0, sem offsets)
- Sem scroll vertical
- Camera shake em pedra: `shake(250, 0.008)` somente se nao gameOver

---

## Comandos uteis

### Dev local
```bash
cd jogo
npm install
npm run dev
# abre http://localhost:5173
```

### Acesso mobile na mesma rede
```bash
# descobre IP (Windows)
ipconfig

# no celular, abre http://<ip>:5173
```

### Build de producao
```bash
cd jogo
npm run build
# saida em jogo/dist/, pronto pra Pages
```

### Re-rodar engenharia reversa
```bash
# regenera JSONs e PNGs (precisa pesquisa/lawn-mower-original/ presente)
cd pesquisa/analise
python extract_chr.py ../lawn-mower-original/patterns.chr
python extract_palette.py
python extract_levels.py
```

### Re-clonar Lawn Mower original (gitignored)
```bash
cd pesquisa
git clone https://github.com/sehugg/lawn-mower-nes.git lawn-mower-original
```

---

## Quirks / armadilhas conhecidas

### PowerShell stderr wrapping
Comandos nativos (git, npm) podem aparecer como erro no PS quando usam stderr.
Solucao: nao usar `2>&1` em nativo. Verificar resultado pelo arquivo / git status.

### git heredoc com aspas quebra
`git commit -m @'...'@` em PowerShell quebra se a mensagem contiver `"..."`.
Solucao: escrever em `.git_commit_msg` e usar `git commit -F .git_commit_msg`.

### CRLF/LF warnings
Git no Windows reclama mas converte automaticamente. Ignorar warnings.

### AudioContext suspended em mobile Safari
Se voce alterar SfxPlayer ou TitleScene, mantenha `sfx.prime()` no
handler dos botoes JOGAR e selectors. Sem isso, primeiro SFX silencia
em mobile Safari.

### Workflow nao roda quando nada em jogo/ muda
O workflow filtra `paths: ['jogo/**', '.github/workflows/deploy.yml']`.
Se voce muda apenas `pesquisa/`, `qa/` ou docs raiz, o deploy nao re-roda.
Pode forcar via Actions tab > Run workflow.

---

## Memorias / preferencias do usuario

- Nome no email: eng.andrehz@gmail.com (Andre)
- GitHub org: `terra-gentil` (org, nao usuario pessoal)
- Path local: `C:\Gitlab_hz\terra-gentil-game\`
- Idioma: PT-BR coloquial, abrevia ("ok", "to ok", "bora")
- Estilo: autonomy-friendly — espera execucao apos green light, nao gosta
  de muita pergunta. Da "ok" / "bora" / "vamos" como aprovacao.
- Nao quer travessao em texto gerado
- Aceita riscos pequenos (P3/P4) sem fix imediato
- Pede QAs para tudo (politica que ele estabeleceu)

---

## Status de QA por sprint

| Sprint | Passes feitos | P1 abertos | Status |
|--------|--------------|------------|--------|
| G0 | 1, 2, 3, 4 | 0 | Limpo |
| G1 | 1, 2, 3, 4 | 0 | Limpo |
| G2 | 1, 2, 3, 4 | 0 | Limpo |
| G3 | 1, 2, 3, 4 | 0 | Limpo |
| G4 | 1, 2, 3 | 0 | Limpo |
| G5 | 1, 2, 3 | 0 | Limpo |
| G6 | 1, 2 | 0 | Limpo (P1-01/P1-02 fechados em qa-fixes round-3) |
| G7 | 1 | 0 | 4 P1 fechados em qa-fixes round-4 (proxy headers, USER, fixture, test_cors). P1-G7-02 reaberto 2026-05-04 (regressao prod) e re-fechado em hotfix `1290ddd` via entrypoint script |
| G7.5 | 1 | 0 | Limpo (so P2 documentais) |
| G8 | 1 | 0 | 4 P1 fechados em qa-fixes round-4 (cuts reset, alive flag, TOP 13, timeout) |

Todos os P1 dos 4 rounds de QA foram aplicados.

**Politica de QA (atualizada 2026-04-30)**: rodar so quando o usuario pedir
explicitamente. Sub-agentes em paralelo consomem muitos tokens; o usuario
sinalizou que talvez agrupe revisoes de 4 em 4 sprints. Quando rodar,
continuar cobrindo TODAS as sprints existentes.

**Round-4 (2026-04-30)**: rodado em opcao C (1 sub-agente Sonnet por sprint,
10 paralelos). Achou P0=0, P1=8, P2=23, P3=54. Todos os 8 P1 fechados em
commit `ef0ac6a` (qa-fixes round-4). Os 20 relatorios estao em
`qa/g{0..8,7.5}/pass-{NN}/{relatorio,handoff}.md`.

**Round-5 (2026-04-30, sem QA novo)**: aplicado 4 P2 cirurgicos + Vitest
onboarding + docs. ESC fecha SubmitModal (G8), cursor preserva posicao em
input (G8), logs uvicorn sem IP (G7 LGPD), created_at com tzinfo UTC (G7).
Novo: `jogo/` ganhou Vitest + jsdom. 12 tests cobrindo `adoptNicknameFromUrl`.
Commit `79806d9`. Tambem branch `g6.5-audio-prep` com facade dual synth/OGG
pronta pra Andre dropar OGGs do FamiStudio.

**Round-6 (2026-04-30, sem QA novo)**: 9 P2 backend hardening + frontend.
Business rule -> 400 (G7), exception_handler global (G7), WAL defensivo
em get_connection (G7), validate_plausible rejeita time > 60min (G7),
test pra GET rate limit (G7), HEALTHCHECK no Dockerfile (G7), log lifespan
(G7), localStorage com console.warn (G8), TitleScene flag transitioning
gateando duplo-clique (G8). Commit `467efb2`. Backend 22/22 pytest passa.

**Estado P2 pos round-6**: 13 P2 fechados nos 3 rounds de fixes. Sobram ~10 P2
todos UX/trade-offs documentados em "Trade-offs aceitos" ou pendentes de
G6.5/G9.

**Smoke test agendado falhou em rodar (2026-05-02)**: routine
`trig_01QMkJghtGnCgiFW3uPUYrHK` foi auto-disabled com motivo
`auto_disabled_repo_access` porque GitHub nao tava conectado pro repo
`terra-gentil/terra-gentil-game`. Resultado: round-4/5/6 deployados em prod
mas SEM validacao automatica externa por ~4 dias.

**Resolvido em 2026-05-04 via GitHub Actions** (commit `c1bd7f5`):
descoberto que mesmo com `/web-setup` conectado, sandbox do Anthropic Cloud
bloqueia outbound HTTP pra Railway com `host_not_allowed` — allowlist de
plataforma, nao configuravel pelo usuario. Routine Claude nao consegue
fazer smoke contra prod por design. Migracao pra GitHub Actions:
`.github/workflows/smoke.yml` com cron `0 12 * * *` (9h BRT diario) e
`workflow_dispatch` pra trigger manual. Roda os 6 mesmos curls com
validacao via `set -euo pipefail` + `jq -e`. Falhas geram email automatico
pra eng.andrehz@gmail.com. Primeiro run em 2026-05-04 23:16Z passou 6/6
(run id 25348753277). Routine `trig_019Zm6vSMop98mBXaJhTyfdu` ficou
disabled como historico.

**Hotfix P1-G7-02 (2026-05-04)**: smoke test manual em prod (6 curls) detectou
prod retornando 502 em todos endpoints. Causa: round-4 adicionou USER appuser
no Dockerfile mas o volume Railway monta sobre /data com owner root em runtime,
descartando o chown do build. uvicorn falhava em init_db (PermissionError em
sqlite3.connect) e nao bind na porta. Fix: container starta como root, novo
`backend/entrypoint.sh` refaz chown em runtime, depois dropa privileges pra
appuser via `su -p` antes de exec uvicorn. Mantem P1-G7-02 fechado.

Smoke pos-hotfix (2026-05-04):
- GET /health -> 200
- GET /scores/top -> 200, ordering correto (PERSIST lvl4 > DIAG lvl2)
- POST /scores valido -> 201, id=3 (sequencial), created_at com tzinfo (round-5 OK)
- POST nickname lowercase -> 422 Pydantic regex (mensagem correta)
- POST pct=100 level=5 -> 400 business rule (round-6 OK, antes era 422)
- OPTIONS CORS preflight -> 200 com Access-Control-Allow-Origin GitHub Pages

Score residual `SMOKE18500` (id=3) ficou no banco junto com DIAG/PERSIST.
Vai ser empurrado pra baixo conforme jogadores reais postarem.

**Smoke test automatizado: RESOLVIDO** (2026-05-04, via GitHub Actions —
ver secao acima). Caminho descartado: routine Claude bate em
`host_not_allowed` no sandbox da Anthropic Cloud, nao da pra contornar.
Caminho ativo: `.github/workflows/smoke.yml` no proprio repo.

---

## Proximas decisoes pendentes (G9 / G7.5)

G7 e G8 fechados. Backend prod em `https://terra-gentil-game-production.up.railway.app`,
frontend ranking integrado e validado em browser.

**Decisoes UX tomadas em G8** (defaults aceitos pelo usuario):
1. Submit aparece automatico em level clear da fase 10 E em game over (escolha
   minha pra nao restringir submit a quem zerou — autonomy decision)
2. Validacao client-side com regex `[A-Z0-9_]{3,12}`, auto-uppercase, feedback
   visual em tempo real
3. Tela de top em scene nova `RankingScene`, acessada por botao "RANKING" no
   canto superior direito do Title
4. Cache de nickname em `localStorage["gentileza:nickname"]`
5. URL hardcoded em `Constants.ts` (decisao pragmatica — env vars Vite seriam
   over-engineering pra um projeto so)

**Trade-off aceito**: selector 1-10 do Title coloca em modo pratica (NAO
oferece submit em game over/win). Justo: comecou no meio, total_pct seria
falso. Quem quer ranking real, JOGAR desde a fase 1.

### Pra G9 (visual final)
1. Sprite real do mascote Gentileza (atualmente retangulo amarelo com borda)
2. Tilemap pixel-art real (atualmente retangulos coloridos)
3. Direcao de arte definitiva (qual estilo? referencia)

### G7.5 (CONCLUIDO 2026-04-30)
Repo do app: `terra-gentil/terra-gentil-app` (clone local em `C:\Gitlab_hz\app-terragentil\`).
Stack: Expo SDK 54 + React Native 0.81 + React Nav 7.

Decisoes tomadas:
- WebView aponta pra URL publica do GitHub Pages (auto-update do jogo sem release nova do app)
- `react-native-webview` ja estava instalado, adicionado `expo-screen-orientation@~9.0.9`
- Nova tela `mobile/src/components/redesign/GameScreen.tsx`: WebView fullscreen, landscape lock no mount, restore portrait no unmount, BackHandler do Android, status bar oculta, botao X overlay top-right, loading spinner ate WebView terminar de carregar
- Pra navegacao usei state condicional em `App.tsx` (`showGame`) ao inves de stack route, pra casar com o padrao existente (Welcome / Loading / Diagnosis ja sao if/else no root)
- Nickname via URL: app passa `?nickname=ANDRE` se user tiver, jogo le em `main.ts` via `adoptNicknameFromUrl()` que valida regex e seed o `localStorage["gentileza:nickname"]`. Modal de submit ja consome esse cache. Por ora app SEMPRE passa undefined (nao tem auth/user ainda no app), entao jogo cai no fluxo proprio. Wireado pro futuro.
- Card "Resgate dos Jardins" no HomeTab acima dos atalhos rapidos, com Gamepad2 icon e botao "Jogar" coral

Trade-off aceito: app ainda nao tem sistema de user/profile, entao nickname nao e propagado por enquanto. Quando o app implementar auth, basta passar `nickname` prop no GameScreen.

---

## Atualizacoes deste arquivo

Atualize as secoes:
- "Ultima atualizacao" e "HEAD atual" no topo
- "Status das sprints" — marcar `[x]` em sprints novas
- "Git log das sprints" — adicionar novos commits
- "Trade-offs aceitos" — se aparecerem novos
- "Trabalho que precisa de acao manual" — atualizar pendentes
- "Status de QA por sprint" — depois de cada round
- Demais secoes conforme novidades

Mantenha o "Como retomar em um novo chat" sempre na primeira secao
funcional pra ser obvio.
