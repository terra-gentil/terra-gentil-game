# QA G0 - Handoff pass-02

**Sprint**: G0 — Engenharia Reversa + Scaffolding Phaser 3
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G0 pass-02

---

## Para reverificacao desta sprint (G0 pass-03 ou re-check)

### O que foi validado nesta pass (pass-02)

| Item | Nivel de confianca |
|------|--------------------|
| Fix do regex `[^\n]+` em `extract_palette.py` | Alto — verificado byte a byte contra `palette.asm:207-217` |
| `palettes.json` com 4 sub-paletas em todas as 4 paletas nomeadas | Alto — verificado diretamente no JSON |
| Fix do `int()` em `extract_levels.py` | Alto — calculado manualmente para todas as 10 fases |
| `fuel_inc_por_tile_8_8` == `meta_done_inc_8_8` em todos os 10 niveis | Alto — cruzado entre JSON editor e runtime |
| `niveis.json` (public e dist) usa valores corrigidos | Alto — lido diretamente |
| Docs: "4 sub-paletas", "light brown", "$14" singular, "int()" | Alto — lido diretamente nos 3 MDs |
| Spawn usando `editor_x/editor_y` no GameScene.ts | Alto — analisado e CONFIRMADO CORRETO (sem borda no grid do port) |
| Camera horizontal sem scroll vertical | Alto — lerpY=0, setBounds apenas horizontal |
| Flowers -> CUT em uma pisada (desvio do NES) | Medio — identificado, documentado, baixo risco |
| Stones: sem conversao de tile (correto) | Alto — verificado no codigo |
| 14 SFX mapeados de sounds.asm | Alto — mapeamento completo extraido |
| Tiles 4-7: nenhuma fase real usa esses valores | Alto — pesquisa no JSON confirmou ausencia |

### Gaps desta pass (nao cobertos)

- `patterns.chr` bytes brutos: ainda nao inspecionado diretamente. A confianca nas extractions e alta mas seria util um hexdump dos primeiros 95 bytes do offset 4096 pra confirmacao absoluta.
- `bgm_*.asm` (exceto bgm_game.asm que teve sua estrutura lida): os 5 BGMs nao foram analisados em detalhe. Relevante para G6 audio.
- `done.rle`, `title.rle`, `title.asm`: nao inspecionados.
- `01_mapeamento.txt`: nao lido.

---

## Contratos e invariantes da G0 (atualizados para pass-03)

### CORRECAO em relacao ao handoff da pass-01

O handoff da pass-01 afirmou que o spawn devia usar `game_x/game_y`. Isso estava **incorreto** para o port. O grid do port nao tem bordas, portanto:

- **CORRETO**: usar `editor_x` / `editor_y` para spawn no port
- **INCORRETO**: usar `game_x` / `game_y` no port (esses coords assumem 1-tile border esquerda + 3-tile border top do NES)

Invariante atualizado:
```
Spawn do jogador (port JS, grid sem borda):
  playerTileX = spawn_jogador.editor_x
  playerTileY = spawn_jogador.editor_y
  
  Verificacao: tiles[editor_y][editor_x] == 0 (grama cortada) para todas as fases
```

Para referencia NES (grid 32-wide com bordas):
```
  player_x_nes = editor_x + 1
  player_y_nes = editor_y + 3
  (= game_x e game_y no JSON)
```

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

### 2. Mapeamento de tile codes

```
0 -> grama_cortada    (nao conta pro target)
1 -> grama_alta       (alvo de corte, conta pro done_cnt)
2 -> flores           (penalty fuel ao pisar, vira CUT no port - sem estado intermediario)
3 -> pedra            (penalty maior + shake, permanece pedra - nao converte)
4-7 -> nunca aparecem em dados reais das 10 fases
```

**Desvio do NES em flores**: No NES, flores tem estado intermediario `$13` (flores cortadas) antes de virar grama cortada. O port converte diretamente para `TILE.CUT`. Comportamento intencionalmente simplificado.

### 3. Dimensoes fixas

- Altura: 11 tiles (invariante absoluto)
- Larguras: 14, 20, 25, 30
- TILE_SIZE: 64px (4x do NES metatile 16px)
- Resolucao base: 1280x720

### 4. Camera scroll

- Scroll horizontal somente. lerpY=0 garante sem scroll vertical.
- `setBounds(0, 0, Math.max(worldW, GAME_WIDTH), GAME_HEIGHT)` — correto.
- Fases 1-3 (14 tiles = 896px < 1280px): sem scroll, mapa centralizado.
- Fases 4+ (>= 20 tiles = 1280px+): scroll horizontal.

### 5. Paletas (STATUS: JSON CORRETO apos fix 49db09a)

Todas as 4 paletas nomeadas tem 16 bytes = 4 sub-paletas. Safe para uso direto em G6+.

Paletas verificadas:
- `palTitle` sub-paleta[3]: `[$0F,$0B,$29,$30]` = `[#000000,#005800,#B8F818,#FCFCFC]`
- `palGameSprites` sub-paleta[3]: `[$0F,$0F,$00,$30]` = `[#000000,#000000,#7C7C7C,#FCFCFC]`
- `palGame` sub-paleta[3]: `[$0F,$0A,$10,$20]` = `[#000000,#006800,#BCBCBC,#F8F8F8]`

### 6. SFX mapeados (para G6 audio)

| ID | Nome | Evento | Arquivo: linha |
|----|------|--------|----------------|
| 0 | SFX_ENGINE_START | Motor liga | game.dasm:103 |
| 1 | SFX_ENGINE_STOP | Motor desliga | game.dasm:104 |
| 2 | SFX_ENGINE_STALL | Motor travado | game.dasm:105 |
| 3 | SFX_START | Inicio de fase | game.dasm:106 |
| 4 | SFX_FUEL_ON_FIELD | Galao aparece | game.dasm:107 |
| 5 | SFX_FUEL_GET | Galao coletado | game.dasm:108 |
| 6 | SFX_GRASS_CUT | Grama cortada | game.dasm:109 |
| 7 | SFX_PAUSE | Pausa | game.dasm:110 |
| 8 | SFX_FUEL_LOW | Combustivel baixo | game.dasm:111 |
| 9 | SFX_SKIP | Cheat pula fase | game.dasm:112 |
| 10 | SFX_MUTE | Silencia SFX | game.dasm:113 |
| 11 | SFX_STONE | Pedra + shake | game.dasm:114 |
| 12 | SFX_FLOWERS | Flores | game.dasm:115 |
| 13 | SFX_ENGINE_TURBO | Turbo ativado | game.dasm:116 |

BGMs (FamiTone, 5 canais):
- `bgm_game.asm` — gameplay (loop)
- `bgm_title.asm` — tela titulo
- `bgm_welldone.asm` — fase concluida
- `bgm_levelclear.asm` — jingle breve de level clear
- `bgm_outoffuel.asm` — game over

### 7. Scaffolding Phaser (status G5 HEAD)

- `GameConfig.ts`: `GAME_WIDTH=1280`, `GAME_HEIGHT=720`, `TILE_SIZE=64`, `COLORS`, `config`
- Scale mode: `Phaser.Scale.FIT` com `CENTER_BOTH`
- `pixelArt: true`, `roundPixels: true`
- Cenas: `[BootScene, TitleScene, GameScene]`
- Settings: `eyeStrainMode` via localStorage (graceful fallback em private mode)
- D-pad virtual: 4 botoes com pointer events, cleanup no SHUTDOWN
- Tap-to-move: pointer global com swipe direction

---

## Para o QA das proximas sprints (G1+ ou G6 audio)

### Sinais de regressao a checar

1. **Spawn do jogador**: `playerTileX = spawn_jogador.editor_x`, `playerTileY = spawn_jogador.editor_y`. O tile nessa posicao deve ser `0` ou `1` (nunca `3`).

2. **Tile counts**: Ao carregar uma fase, contar tiles tipo `1` (TALL) e comparar com `grama_alta_para_cortar`. Deve ser identico.

3. **Camera vertical**: Nenhum movimento em Y. Se a camera se mover verticalmente, e regressao.

4. **Flores**: Verificar se a simplificacao de um estado (flores -> CUT direto) esta documentada e intencional. Se implementar estado intermediario, checar que nao afeta `done_cnt`.

5. **Pedras**: Confirmar que tiles tipo 3 nunca se convertem para outro tipo ao serem pisados.

6. **Fuel decay**: O sistema atual (100 pontos, -1 a cada 500ms em movimento) e uma aproximacao. Se G6 reimplementar fuel para fidelidade NES, revisar toda a logica de penalty e game over.

### O que esta estavel em G0 (nao precisa re-verificar)

- Todas as 10 fases decodificadas corretamente (tile maps, spawn, largura)
- fuel_inc correto em todos os 10 niveis
- Paletas corretas (16 bytes, 4 sub-paletas cada)
- Docs do ANALISE atualizadas e corretas
- Camera scroll horizontal (sem vertical)
- TypeScript strict mode, noUnusedLocals, noUnusedParameters
