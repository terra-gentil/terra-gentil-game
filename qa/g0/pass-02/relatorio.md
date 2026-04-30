# QA G0 - Relatorio pass-02

**Sprint**: G0 — Engenharia Reversa do Lawn Mower NES + Scaffolding Phaser 3
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G0 pass-02
**Commits revisados**: HEAD=d484e11 (G5), base=49db09a (qa-fixes G0)
**Build validado**: nao (analise estatica manual; shell negado no ambiente)

---

## Cobertura

| Area | O que foi lido | Status |
|------|----------------|--------|
| `extract_palette.py` HEAD | Lido completamente | Coberto |
| `extract_levels.py` HEAD | Lido completamente | Coberto |
| `palettes.json` HEAD | Verificado contra `palette.asm` byte a byte | Coberto |
| `fases_editor.json` HEAD | Verificado fuel_inc todas as 10 fases + tile content | Coberto |
| `fases_runtime.json` HEAD | Cruzado com fases_editor.json, todos os campos validados | Coberto |
| `niveis.json` (public e dist) | Verificado: identico ao fases_editor.json fixado | Coberto |
| `ANALISE_LAWN_MOWER.md` secoes 3, 4.2, 8 | Verificadas correcoes de "4 sub-paletas" e "light brown" | Coberto |
| `02_estrutura_codigo.md` tabela de tile codes | Verificada correcao de $14 (singular) | Coberto |
| `03_editor.md` formula de inc | Verificada correcao de int() vs round() | Coberto |
| `GameScene.ts` HEAD (G5) | Lido completamente; spawn, camera, tiles, fuel | Coberto |
| `Level.ts`, `Settings.ts`, `GameConfig.ts` | Lidos completamente | Coberto |
| `TitleScene.ts`, `BootScene.ts` | Lidos completamente | Coberto |
| `sounds.asm` | Lido (14 SFX definidos) | Coberto parcial |
| `bgm_game.asm` | Estrutura lida (FamiTone channels) | Coberto parcial |
| `bgm_*.asm` demais | Listados, nao lidos em detalhe | Gap |
| `patterns.chr` bytes brutos | Nao lido diretamente (confiamos nas extractions) | Gap |
| `done.rle`, `title.rle` | Nao inspecionados | Gap |
| Tiles 4-7 em fases reais | CONFIRMADO: nenhuma fase usa tiles 4-7 | Coberto |

---

## Verificacao dos fixes da pass-01

### Fix 1: `extract_palette.py` regex `[^\n]+` — VERIFICADO OK

**Arquivo**: `pesquisa/analise/extract_palette.py:39`

O regex foi corrigido de `[\$\w\s,]+` para `([^\n]+)`, limitando a captura a uma unica linha. O docstring na funcao `parse_named_palette` (linhas 34-37) documenta explicitamente o bug anterior e a correcao. O `palettes.json` resultante mostra:

- `palTitle`: `total_bytes=16`, 4 sub-paletas — CORRETO
- `palGameSprites`: `total_bytes=16`, 4 sub-paletas — CORRETO
- `palGame`: `total_bytes=16`, 4 sub-paletas — CORRETO
- `palDone`: `total_bytes=16`, 4 sub-paletas — CORRETO (era correto antes tambem)

Verificacao cruzada com `palette.asm:207-217`:
- `palTitle`: ASM tem `$0f,$0b,$28,$39,...,$0f,$0b,$29,$30` — JSON tem `[$0F,$0B,$28,$39],...,[$0F,$0B,$29,$30]` — IDENTICO
- `palGameSprites`: ASM tem `$0f,$11,$27,$20,...,$0f,$0f,$00,$30` — JSON tem `[$0F,$11,$27,$20],...,[$0F,$0F,$00,$30]` — IDENTICO
- `palGame`: ASM tem `$0f,$11,$21,$30,...,$0f,$0a,$10,$20` — JSON tem `[$0F,$11,$21,$30],...,[$0F,$0A,$10,$20]` — IDENTICO

**Fix suficiente**: Sim. P1 da pass-01 resolvido.

**Nota**: O handoff da pass-01 indicou `$0a -> #005800` mas isso estava errado no proprio handoff. O NES_PALETTE correto e `$0A = (0x00, 0x68, 0x00) = #006800` (dark green) e `$0B = (0x00, 0x58, 0x00) = #005800`. O JSON esta correto.

---

### Fix 2: `extract_levels.py` round() -> int() — VERIFICADO OK

**Arquivo**: `pesquisa/analise/extract_levels.py:72`

O codigo agora usa `int(100 * 256 / cut_target)`, com comentario explicativo nas linhas 69-71 referenciando o bug da pass-01 e o `Unit1.cpp:471`.

Verificacao completa de todas as 10 fases (`fuel_inc_por_tile_8_8` vs `meta_done_inc_8_8`):

| Fase | grama_alta | int(100*256/n) | fases_editor | fases_runtime | Match? |
|------|-----------|----------------|--------------|---------------|--------|
| 01   | 96         | 266            | 266          | 266           | OK |
| 02   | 116        | 220            | 220          | 220           | OK |
| 03   | 122        | 209            | 209          | 209           | OK |
| 04   | 183        | 139            | 139          | 139           | OK |
| 05   | 173        | 147            | 147          | 147           | OK |
| 06   | 247        | 103            | 103          | 103           | OK |
| 07   | 190        | 134            | 134          | 134           | OK |
| 08   | 221        | 115            | 115          | 115           | OK |
| 09   | 247        | 103            | 103          | 103           | OK |
| 10   | 248        | 103            | 103          | 103           | OK |

Todos os 10 valores batem perfeitamente. O `niveis.json` (public e dist) tambem usa os valores corrigidos. **Fix suficiente**: Sim. P1 da pass-01 resolvido.

---

### Fix 3: Docs corrigidas — VERIFICADO OK

**ANALISE_LAWN_MOWER.md secao 8**:
Texto agora diz:
- `palTitle`: tela de titulo (4 sub-paletas BG)
- `palGameSprites`: sprites no gameplay (4 sub-paletas SPR)
- `palGame`: backgrounds no gameplay (4 sub-paletas BG)
- `palDone`: tela final (4 sub-paletas BG)
Corrigido de "3" para "4". P1 resolvido.

**ANALISE_LAWN_MOWER.md secao 4.2** (palList):
`06 light brown` — lido diretamente no arquivo, confirmado. P2 resolvido.

**02_estrutura_codigo.md tabela de tile codes**:
`| $14 | Pedra (tile unico, 4 frames de animacao CHR) |` — sem `$15`. P2 resolvido.

**03_editor.md formula de inc**:
`+2 bytes : inc LE    (incremento de % por corte = int(100*256/tcnt) truncado, igual ao C++ original)` — truncamento documentado corretamente. P1 resolvido.

---

## Achados da pass-02

### NOVO P2 — `GameScene.ts`: flores mudam para `TILE.CUT` em uma pisada (devia ser estado intermediario)

**Arquivo**: `jogo/src/scenes/GameScene.ts:484-487`

```typescript
} else if (type === TILE.FLOWERS) {
  this.applyFuelPenalty(PENALTY_FLOWERS);
  this.level.tiles[ty][tx] = TILE.CUT;
  this.tileGrid[ty][tx].setFillStyle(COLORS.GRASS_CUT);
}
```

No NES original (`game.dasm:1855-1875`), flores tem dois estados:
1. Primeiro contato (`$12`): vira `$13` (flores cortadas), aplica penalty de FUEL/6. O tile permanece visivel como "flores cortadas".
2. Segundo contato (`$13`): vira grama cortada aleatoria (`$0a-$0d`), toca SFX_GRASS_CUT.

O port converte flores diretamente para `CUT` em um unico contato. Consequencia pratica:
- Visualmente: flores desaparecem imediatamente (sem frame intermediario de "flores cortadas")
- Saldo de fuel: o penalty e aplicado apenas uma vez nos dois casos — sem diferenca de balanceamento (a segunda pisada em `$13` no NES nao aplica penalty adicional)
- O tile nao conta para `done_cnt` em ambas as versoes, entao a contagem de % nao e afetada

**Impacto no balanceamento**: Baixo (penalty identico). **Impacto visual/fidelidade**: Medio — ausente o estado intermediario `$13`.

**Recomendacao**: Para G6+ que implementar tiles reais, considerar adicionar estado `FLOWERS_CUT` ao enum TILE para fidelidade ao original. Ou documentar deliberadamente como simplificacao aceita.

---

### NOVO P2 — `GameScene.ts` usa `editor_x/editor_y` para spawn (intencional, mas contra-intuitivo dado o handoff)

**Arquivo**: `jogo/src/scenes/GameScene.ts:195-196`

```typescript
this.playerTileX = this.level.spawn_jogador.editor_x;
this.playerTileY = this.level.spawn_jogador.editor_y;
```

O handoff da pass-01 alertou explicitamente: "Nao aplicar offset duplo" e "Spawn position: Posicao inicial do jogador em tiles deve ser exatamente `(game_x, game_y)` do JSON". Porem, na pratica, `editor_x/editor_y` e CORRETO para o port porque:

- O NES usa grid de 32 colunas com 1 coluna de borda a esquerda e 3 linhas de borda em cima
- O port usa grid de `largura_efetiva_tiles` colunas SEM bordas
- Os `editor_x/editor_y` do JSON ja apontam para a posicao correta no grid sem borda
- `game_x = editor_x + 1` e `game_y = editor_y + 3` sao coordenadas para o grid NES COM borda

Verificacao para fase 01: `editor_x=6, editor_y=5` -> `tiles[5][6] = 0` (grama cortada, area spawn correta). `game_x=7, game_y=8` seria `tiles[8][7] = 1` (grama alta — posicao errada para spawn).

**Conclusao**: O codigo esta correto. O handoff da pass-01 estava errado neste ponto — ele foi escrito assumindo que o port usaria um grid com bordas. O handoff para pass-03 deve corrigir este invariante.

---

### NOVO P3 — `sounds.asm`: 14 SFX definidos, nenhuma documentacao

**Arquivo**: `pesquisa/lawn-mower-original/sounds.asm`

14 SFX definidos (sfx0 a sfx13), mapeados no `game.dasm:103-116`:

| SFX ID | Nome | Evento |
|--------|------|--------|
| 0 | SFX_ENGINE_START | Motor liga |
| 1 | SFX_ENGINE_STOP | Motor desliga |
| 2 | SFX_ENGINE_STALL | Motor travado |
| 3 | SFX_START | Inicio de fase |
| 4 | SFX_FUEL_ON_FIELD | Galao aparece no campo |
| 5 | SFX_FUEL_GET | Galao coletado |
| 6 | SFX_GRASS_CUT | Grama cortada |
| 7 | SFX_PAUSE | Pausa |
| 8 | SFX_FUEL_LOW | Combustivel baixo |
| 9 | SFX_SKIP | Cheat pula fase |
| 10 | SFX_MUTE | Silencia SFX |
| 11 | SFX_STONE | Pedra (+ camera shake) |
| 12 | SFX_FLOWERS | Flores |
| 13 | SFX_ENGINE_TURBO | Turbo ativado |

Esta documentacao nao existia em nenhum MD e e relevante para a sprint de audio (G6). O arquivo usa formato FamiTone com opcodes como `$10` (volume), `$13/$14` (durations), `$ff` (loop), `$00/$01/$02` (envelope/duty), etc.

---

### NOVO P3 — `GameScene.ts`: fuel system e uma aproximacao (100 pontos, nao 8:8 fixed-point)

**Arquivo**: `jogo/src/scenes/GameScene.ts:25, 116`

O port usa `FUEL_MAX = 100` e `FUEL_DECAY_INTERVAL_MS = 500` (decai 1 ponto a cada 0.5s de movimento). O NES original usa `GAME_FUEL_MAX = 232` em fixed-point e decrementa por frame via interrupcao de hardware. O port e uma aproximacao funcional, nao uma replica exata do timer de combustivel. Este e um desvio documentado e intencional, sem impacto na jogabilidade percebida pelo publico-alvo.

---

### NOVO P3 — `BootScene.ts`: `console.log` remanescente em producao

**Arquivo**: `jogo/src/scenes/BootScene.ts:13`

```typescript
console.log('BootScene: assets carregados');
```

Tambem em `TitleScene.ts:102`. Logs de debug em producao sao ruido, especialmente se o jogo for deployado em GitHub Pages. Baixo risco, mas recomendado remover antes do deploy.

---

### Gaps confirmados da pass-01 (sem novos achados)

**Tiles 4-7**: Nenhuma das 10 fases usa tile values 4, 5, 6 ou 7 no campo `tiles`. O TILE_COLOR fallback no GameScene.ts usa `0x222222` para tipos desconhecidos (linha 182), que e comportamento seguro.

**`patterns.chr` bytes brutos**: Permanece nao inspecionado diretamente. A confianca via extractions e alta — todos os 10 valores `meta_done_inc_8_8` batem com os calculos derivados do editor JSON.

**`done.rle`, `title.rle`**: Permanece nao inspecionado. Fora do escopo G0.

---

## Riscos residuais

1. **Flores: estado intermediario ausente** (P2 novo): Fidelidade visual reduzida. Sem impacto no balanceamento. Risco baixo de regressao em G6+ se assets reais forem implementados sem considerar este estado.

2. **`fuel_inc_por_tile_8_8` no `Level.ts`**: O campo esta presente no `LevelJson` interface mas nao e usado em nenhuma logica do GameScene.ts (o port usa seu proprio `FUEL_MAX=100`). O campo e tecnicamente "cargo data" no bundle — baixo risco mas pode confundir futuros desenvolvedores.

3. **Audio**: 14 SFX e 5 BGMs no original nao tem equivalente no port ainda. Para G6 de audio, o mapeamento SFX acima e a referencia primaria.

---

## O que esta bom (confirmado nesta pass)

- **Todos os 4 fixes da pass-01 foram corretamente aplicados**: paletas com 16 bytes, fuel_inc com truncamento, docs com "4 sub-paletas", "light brown", "$14" singular e "int()" truncamento.

- **niveis.json (public e dist)**: Ambos os arquivos deployados tem os valores corrigidos do fuel_inc. O fix chegou ate o artefato deployado.

- **GameScene.ts camera**: Para fases menores que 1280px, o worldOffsetX centra o mapa horizontalmente e a camera se limita a [0, GAME_WIDTH]. Para fases maiores, a camera segue o player horizontalmente sem scroll vertical (lerpY=0). Correto.

- **Spawn do jogador**: Usar `editor_x/editor_y` e correto para um grid sem bordas — verificado que o tile correspondente e sempre grama cortada (tipo 0) para todas as fases.

- **Stone behavior**: Pedra aplica penalty + shake mas NAO converte o tile para CUT, igual ao NES original.

- **HUD totalTiles**: Usa `this.level.grama_alta_para_cortar` diretamente do JSON (nao recalcula), portanto o bug do Math.ceil (a7db08a) nao pode regredir neste path.

- **Scaffold G5**: Settings (eyeStrainMode), D-pad virtual, tap-to-move, fuel barrel spawn, game over e level clear estao implementados de forma robusta com SHUTDOWN cleanup de event listeners.

---

## Recomendacoes para sprints futuras

1. **G6 audio**: Usar a tabela de 14 SFX acima como referencia. O formato FamiTone binary em `sounds.asm` precisa de decodificador ou substituicao por Web Audio API equivalente.

2. **Flores**: Documentar explicitamente se o estado intermediario `$13` sera implementado ou descartado. Se descartado, registrar no handoff como desvio intencional.

3. **`fuel_inc_por_tile_8_8` em Level.ts**: Adicionar comentario JSDoc explicando que este campo e referencia historica do NES e nao e usado pelo sistema de fuel do port.

4. **console.log**: Remover antes do deploy de producao em `BootScene.ts:13` e `TitleScene.ts:102`.

5. **Paletas**: O `palettes.json` agora esta correto e pode ser importado com seguranca para implementacao de telas titulo/game/done em G6+.
