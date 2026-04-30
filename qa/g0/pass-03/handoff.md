# QA G0 - Handoff pass-03

**Sprint**: G0 — Engenharia Reversa + Scaffolding Phaser 3
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G0 pass-03
**HEAD verificado**: `aa2633a`

---

## Status geral: ENCERRADO SEM ACHADOS

G0 esta estavel. Tres passes de QA concluidas sem achados novos apos pass-02. O territorio `pesquisa/` nao foi tocado desde `49db09a`. Todos os contratos sao respeitados em HEAD.

---

## Para reverificacao desta sprint (caso necessario)

### O que foi validado nesta pass (pass-03)

| Item | Nivel de confianca |
|------|--------------------|
| Commits G6 (`aa2633a`) e qa-fixes (`a67a26b`) nao tocaram `pesquisa/` | Alto — `git diff 49db09a aa2633a -- pesquisa/` retornou vazio |
| `niveis.json` (public) identico a `fases_editor.json` | Alto — diff byte a byte retornou IDENTICAL |
| Spawn usa `editor_x`/`editor_y` em `GameScene.ts:198-199` | Alto — lido diretamente |
| Camera: lerpY=0, setBounds horizontal apenas | Alto — `startFollow(player, false, 0.1, 0)`, `setBounds(0,0,cameraWorldW,GAME_HEIGHT)` |
| Flores: CUT direto (sem estado intermediario), STONE permanece | Alto — `onEnterTile()` lido diretamente |
| SFX G6 semanticamente alinhado com mapeamento G0 | Alto — 6/14 SFX implementados, os 6 cobertos sao corretos |
| `Settings.ts` novo nao afeta contratos G0 | Alto — apenas `eyeStrainMode` e `soundEnabled` |

### Gaps acumulados (nao cobertos em nenhuma das 3 passes)

- `patterns.chr` bytes brutos: hexdump dos primeiros 95 bytes a partir do offset 4096. Confianca alta mas nao verificado diretamente.
- `bgm_*.asm` (exceto estrutura de `bgm_game.asm`): dados de notas nao analisados. Necessario para implementacao fiel de BGM em G7+.
- `done.rle`, `title.rle`, `title.asm`: nao inspecionados.
- `01_mapeamento.txt`: nao lido.
- 10 de 14 SFX NES nao implementados no `SfxPlayer.ts` (backlog G7+).

---

## Contratos e invariantes da G0 (versao final, pass-03)

### 1. Formato `niveis.json` (fases_editor.json deployado)

```typescript
{
  id: number,                          // 1..10
  largura_efetiva_tiles: number,       // 14 | 20 | 25 | 30
  altura_tiles: 11,                    // FIXO
  playable_tiles_total: number,        // largura_efetiva_tiles * 11
  spawn_jogador: {
    editor_x: number,                  // usar isto no port (grid sem borda)
    editor_y: number,                  // usar isto no port (grid sem borda)
    game_x: number,                    // NAO usar no port (inclui offset borda NES)
    game_y: number,                    // NAO usar no port (inclui offset borda NES)
  },
  grama_alta_para_cortar: number,      // count de tiles==1 na area playable
  fuel_inc_por_tile_8_8: number,       // referencia historica NES, nao usado no port
  tiles: number[][],                   // [row][col]
}
```

**Nota historica**: `fuel_inc_por_tile_8_8` no `fases_editor.json` usa `int()` (corrigido em `49db09a`, antes usava `round()`). O valor correto para runtime NES esta em `fases_runtime.json` como `meta_done_inc_8_8`. O port JS nao usa esse campo diretamente.

### 2. Mapeamento de tile codes

```
0 -> grama_cortada    (nao conta pro target)
1 -> grama_alta       (alvo de corte, conta pro done_cnt)
2 -> flores           (penalty fuel ao pisar, vira CUT no port - sem estado intermediario)
3 -> pedra            (penalty maior + shake, permanece pedra - nao converte)
4-7 -> nunca aparecem em dados reais das 10 fases
```

**Desvio do NES em flores**: No NES, flores tem estado intermediario `$13` (flores cortadas) antes de virar grama cortada. O port converte diretamente para `TILE.CUT`. Comportamento intencionalmente simplificado. Nao afeta `done_cnt` (flores nunca contam para o total).

### 3. Dimensoes fixas

- Altura: 11 tiles (invariante absoluto)
- Larguras: 14, 20, 25, 30 (fases 1-3, 4-5, 6-8, 9-10)
- TILE_SIZE: 64px (4x do NES metatile 16px)
- Resolucao base: 1280x720

### 4. Spawn do jogador (port JS — grid sem borda)

```
playerTileX = spawn_jogador.editor_x
playerTileY = spawn_jogador.editor_y
```

Para referencia NES (grid 32-wide com bordas):
```
player_x_nes = editor_x + 1   (= game_x no JSON)
player_y_nes = editor_y + 3   (= game_y no JSON)
```

Todos os `editor_y` de spawn sao `5` para a fase 1. Os outros nivels variam.

### 5. Camera scroll

- Scroll horizontal somente. `startFollow(player, false, lerpX, 0)` — lerpY=0 garante sem scroll vertical.
- `setBounds(0, 0, Math.max(worldW, GAME_WIDTH), GAME_HEIGHT)` — correto.
- Fases 1-3 (14 tiles = 896px < 1280px): sem scroll efetivo.
- Fases 4+ (>= 20 tiles): scroll horizontal ativo.

### 6. Paletas (STATUS: CORRETO desde `49db09a`)

Todas as 4 paletas nomeadas tem 16 bytes = 4 sub-paletas.

| Paleta | Sub-paleta[3] (NES) | Verificado |
|--------|---------------------|------------|
| `palTitle` | `[$0F,$0B,$29,$30]` | pass-02 |
| `palGameSprites` | `[$0F,$0F,$00,$30]` | pass-02 |
| `palGame` | `[$0F,$0A,$10,$20]` | pass-02 |
| `palBg` | completa (4 sub-paletas) | pass-02 |

### 7. SFX mapeados (14 eventos do NES)

| ID | Nome | Evento | Implementado em SfxPlayer.ts (G6) |
|----|------|--------|----------------------------------|
| 0 | SFX_ENGINE_START | Motor liga | Nao (backlog) |
| 1 | SFX_ENGINE_STOP | Motor desliga | Nao (backlog) |
| 2 | SFX_ENGINE_STALL | Motor travado | Nao (backlog) |
| 3 | SFX_START | Inicio de fase | Nao (backlog) |
| 4 | SFX_FUEL_ON_FIELD | Galao aparece | Nao (backlog) |
| 5 | SFX_FUEL_GET | Galao coletado | `fuelPickup()` |
| 6 | SFX_GRASS_CUT | Grama cortada | `cut()` |
| 7 | SFX_PAUSE | Pausa | Nao (backlog) |
| 8 | SFX_FUEL_LOW | Combustivel baixo | Nao (backlog) |
| 9 | SFX_SKIP | Cheat pula fase | Nao (backlog) |
| 10 | SFX_MUTE | Silencia SFX | `sfx.setMuted()` via Settings |
| 11 | SFX_STONE | Pedra + shake | `penaltyStone()` |
| 12 | SFX_FLOWERS | Flores | `penaltyFlowers()` |
| 13 | SFX_ENGINE_TURBO | Turbo ativado | Nao (backlog) |

BGMs (FamiTone, pendentes de exportacao FamiStudio -> OGG):
- `bgm_game.asm` — gameplay (loop) — aproximado por `levelClear()` (placeholder)
- `bgm_title.asm` — tela titulo
- `bgm_welldone.asm` — fase concluida
- `bgm_levelclear.asm` — jingle breve de level clear
- `bgm_outoffuel.asm` — game over — aproximado por `gameOver()`

### 8. Scaffolding Phaser (status G6 HEAD)

- `GameConfig.ts`: `GAME_WIDTH=1280`, `GAME_HEIGHT=720`, `TILE_SIZE=64`, `COLORS`, `config`
- Scale mode: `Phaser.Scale.FIT` com `CENTER_BOTH`
- `pixelArt: true`, `roundPixels: true`
- `activePointers: 3` (suporte multi-touch D-pad)
- Cenas: `[BootScene, TitleScene, GameScene]`
- Settings: `eyeStrainMode` + `soundEnabled` via localStorage (graceful fallback em private mode)
- Audio: `SfxPlayer` singleton (`sfx`) via Web Audio API, lazy AudioContext, mute toggle

---

## Para o QA das proximas sprints (G7+)

### Sinais de regressao a checar

1. **Spawn do jogador**: `playerTileX = spawn_jogador.editor_x`, `playerTileY = spawn_jogador.editor_y`. Nao usar `game_x`/`game_y` no port.

2. **Tile counts**: Contar tiles tipo `1` (TALL) ao carregar fase e comparar com `grama_alta_para_cortar`. Deve ser identico.

3. **Camera vertical**: Nenhum movimento em Y. Se a camera se mover verticalmente, e regressao.

4. **Flores**: Verificar que a simplificacao (flores -> CUT direto) esta mantida e documentada. Se alguem implementar estado intermediario `$13`, checar que nao quebra `done_cnt`.

5. **Pedras**: Confirmar que tiles tipo 3 nunca se convertem ao serem pisados.

6. **SFX**: Ao implementar SFX NES reais (OGG via FamiStudio), verificar que o `SfxPlayer` mantem a semantica correta por evento (tabela acima). Nao perder o `setMuted()` via Settings.

7. **niveis.json**: Se `fases_editor.json` for regenerado, garantir que `jogo/public/assets/maps/niveis.json` seja atualizado em sincronia.

### O que esta estavel em G0 (nao precisa re-verificar)

- Todas as 10 fases decodificadas corretamente (tile maps, spawn, largura)
- `fuel_inc_por_tile_8_8` correto com `int()` em todos os 10 niveis
- Paletas corretas (16 bytes, 4 sub-paletas cada)
- Docs de analise (`ANALISE_LAWN_MOWER.md`, `02_estrutura_codigo.md`, `03_editor.md`, `04_scroll_e_fases.md`) atualizados e corretos
- Camera scroll horizontal (sem vertical)
- TypeScript strict mode, noUnusedLocals, noUnusedParameters
- SFX G6 alinhado semanticamente com mapeamento G0 (6/14 implementados)
