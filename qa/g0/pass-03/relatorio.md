# QA G0 - Relatorio pass-03

**Sprint**: G0 — Engenharia Reversa + Scaffolding Phaser 3
**Pass**: 03 (terceira verificacao)
**Reviewer**: Sub-agente Sonnet pass-03
**Data**: 2026-04-30
**Base HEAD**: `aa2633a` (G6: SFX sintetizado via Web Audio API + toggle de som)

---

## 1. Escopo desta pass

Verificar se os commits `aa2633a` (G6) e `a67a26b` (qa-fixes round-2) introduziram qualquer drift no territorio G0:
- Scripts de extracao em `pesquisa/analise/`
- JSONs extraidos em `pesquisa/analise/assets-extraidos/`
- Documentos de analise em `pesquisa/analise/`
- Contratos estruturais (niveis.json, spawn, camera, tile codes)

---

## 2. Arquivos tocados pelos commits relevantes

### Commit `aa2633a` (G6: SFX sintetizado)
```
README.md
jogo/src/audio/SfxPlayer.ts       <- NOVO
jogo/src/config/Settings.ts       <- NOVO (soundEnabled adicionado)
jogo/src/scenes/GameScene.ts      <- MODIFICADO (integracao SFX)
jogo/src/scenes/TitleScene.ts     <- MODIFICADO (toggle som)
```

### Commit `a67a26b` (qa-fixes round-2)
```
COMO_RODAR.md
jogo/README.md
jogo/src/scenes/GameScene.ts
qa/g0/pass-02/handoff.md
qa/g0/pass-02/relatorio.md
... (outros qa/)
```

**Resultado**: Nenhum dos dois commits tocou em `pesquisa/` (codigo e dados G0). Confirmado via `git diff 49db09a aa2633a -- pesquisa/` retornar vazio.

---

## 3. Achados

### 3.1 Drift nos arquivos G0

**NENHUM.** Os arquivos abaixo foram verificados e estao identicos ao estado apos `49db09a` (ultimo commit que tocou G0):

| Arquivo | Status |
|---------|--------|
| `pesquisa/analise/extract_palette.py` | Intocado |
| `pesquisa/analise/extract_levels.py` | Intocado |
| `pesquisa/analise/assets-extraidos/palettes.json` | Intocado |
| `pesquisa/analise/assets-extraidos/fases_editor.json` | Intocado |
| `pesquisa/analise/assets-extraidos/fases_runtime.json` | Intocado |
| `pesquisa/analise/ANALISE_LAWN_MOWER.md` | Intocado |
| `pesquisa/analise/02_estrutura_codigo.md` | Intocado |
| `pesquisa/analise/03_editor.md` | Intocado |
| `pesquisa/analise/04_scroll_e_fases.md` | Intocado |

### 3.2 Contratos G0 no codigo do jogo (HEAD `aa2633a`)

#### Spawn do jogador — CORRETO
`GameScene.ts:198-199` usa `spawn_jogador.editor_x` / `editor_y`. Invariante da pass-02 mantido.

#### Camera — CORRETO
`GameScene.ts:210`: `startFollow(this.player, false, 0.1, 0)` — lerpY=0, sem scroll vertical.
`GameScene.ts:170`: `setBounds(0, 0, cameraWorldW, GAME_HEIGHT)` — horizontal apenas.

#### niveis.json identico a fases_editor.json — CORRETO
Diff entre `pesquisa/analise/assets-extraidos/fases_editor.json` e `jogo/public/assets/maps/niveis.json` retornou `IDENTICAL`. Dados de fases intactos.

#### Tile codes — CORRETO
`onEnterTile()` em `GameScene.ts:487-500`:
- `TILE.TALL` -> corte + `sfx.cut()`
- `TILE.FLOWERS` -> `TILE.CUT`, sem estado intermediario + `sfx.penaltyFlowers()`
- `TILE.STONE` -> permanece pedra, penalty fuel + shake + `sfx.penaltyStone()`

Comportamento inalterado vs pass-02. Desvio de flores (sem estado intermediario) permanece documentado e intencional.

#### Contagem de grama cortada — CORRETO
`cutTileAt()` em `GameScene.ts:511-518`: incrementa `cutCount`, compara com `level.grama_alta_para_cortar`.

### 3.3 G6: SFX — alinhamento com mapeamento G0

O `SfxPlayer.ts` implementa 6 metodos sintetizados via Web Audio API:

| Metodo | Mapeamento SFX G0 (sounds.asm) | Alinhado? |
|--------|--------------------------------|-----------|
| `cut()` | SFX_GRASS_CUT (ID 6) | Sim |
| `penaltyFlowers()` | SFX_FLOWERS (ID 12) | Sim |
| `penaltyStone()` | SFX_STONE (ID 11) | Sim |
| `fuelPickup()` | SFX_FUEL_GET (ID 5) | Sim |
| `levelClear()` | SFX_MUTE/bgm_levelclear (G0 doc) | Sim (aprox.) |
| `gameOver()` | bgm_outoffuel (G0 doc) | Sim (aprox.) |

Observacao: G6 usa sintese Web Audio temporaria (documentado no cabecalho do arquivo). Os SFX do NES original (SFX_ENGINE_START/STOP/STALL, SFX_START, SFX_FUEL_ON_FIELD, SFX_FUEL_LOW, SFX_PAUSE, SFX_SKIP, SFX_MUTE, SFX_ENGINE_TURBO) nao foram implementados ainda. Isso e esperado para G6 e nao constitui regressao do territorio G0.

### 3.4 Settings.ts — soundEnabled

`Settings.ts` adicionado em G6 inclui `soundEnabled: boolean` (padrao `true`). O `GameScene.init()` le o setting e chama `sfx.setMuted(!settings.soundEnabled)`. Nao afeta nenhum dado ou contrato G0.

---

## 4. Riscos

**Nenhum risco novo identificado** nesta pass. Os riscos pre-existentes continuam:

| Risco | Nivel | Origem | Status |
|-------|-------|--------|--------|
| `patterns.chr` nao hexdumpado | Baixo | pass-01 gap | Aberto (nao urgente) |
| `bgm_*.asm` nao analisados em detalhe | Baixo | pass-02 gap | Aberto (relevante para G6+ BGM) |
| `done.rle`, `title.rle`, `title.asm` | Baixo | pass-02 gap | Aberto |
| SFX_ENGINE_* e outros SFX NES nao implementados | Medio | G6 escopo parcial | Esperado, documentado |

---

## 5. O que esta bom

- Territorio G0 (`pesquisa/`) totalmente estavel. Zero modificacoes desde `49db09a`.
- Contratos criticos (spawn, camera, tile codes, niveis.json) 100% respeitados em HEAD.
- G6 SFX alinhado semanticamente com o mapeamento de eventos do G0.
- `niveis.json` em `jogo/public/assets/maps/` identico a `fases_editor.json` fonte — sem dessincronizacao.
- TypeScript: Settings.ts e SfxPlayer.ts novos nao tocam em nenhuma interface G0.

---

## 6. Recomendacoes

1. **Nenhuma acao corretiva necessaria** para G0. O codigo de G6 e um consumidor correto dos contratos estabelecidos.

2. **Gap de longo prazo (BGM)**: Quando G7+ implementar BGM real via FamiStudio exports, revisar `bgm_game.asm`, `bgm_title.asm`, `bgm_welldone.asm`, `bgm_levelclear.asm`, `bgm_outoffuel.asm`. O G0 handoff lista as estruturas mas nao analisou os dados das notas.

3. **SFX NES nao implementados**: `SFX_ENGINE_START`, `SFX_ENGINE_STOP`, `SFX_ENGINE_STALL`, `SFX_START`, `SFX_FUEL_ON_FIELD`, `SFX_FUEL_LOW`, `SFX_PAUSE`, `SFX_SKIP`, `SFX_MUTE`, `SFX_ENGINE_TURBO` — 10 de 14 SFX ainda sem correspondente no `SfxPlayer.ts`. Esperado para G6 (escopo parcial), mas deve entrar no backlog de G7+.

4. **G0 encerrado**: Nenhuma re-verificacao adicional de G0 e necessaria, a menos que futuras sprints modifiquem `pesquisa/` ou alterem como os dados de fases sao consumidos.
