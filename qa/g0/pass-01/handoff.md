# QA G0 - Handoff pass-01

**Sprint**: G0 — Engenharia Reversa + Scaffolding Phaser 3  
**Data**: 2026-04-30  
**Reviewer**: Sub-agente Sonnet G0 pass-01

---

## Para reverificacao desta sprint (G0 pass-02 ou re-check)

### O que foi validado nesta pass

| Item | Nivel de confianca |
|------|--------------------|
| Claims numericas do ANALISE (fuel_max, speeds, fuelTimeList, cam formula) | Alto — verificado linha a linha no `game.dasm` |
| Tabela de 10 fases (largura, spawn, grama_alvo) | Alto — cruzado entre dois JSONs e ANALISE |
| Spawn offsets (+1/+3) no `extract_levels.py` | Alto — confirmado pelo `Unit1.cpp` C++ original |
| Bit-packing/unpacking 2-bit CHR no `extract_levels.py` | Alto — algoritmo igual ao C++ |
| Bug `round()` vs `floor()` no `fuel_inc` | Alto — evidencia direta no C++ e diferenca mensuravel no JSON |
| Bug de sub-paleta faltando no `extract_palette.py` | Alto — analise estatica do regex confirmada pelos `total_bytes` no JSON |
| Tile codes de gameplay (`$0e-$11` grama, `$12` flores, `$14` pedra, `$2e-$2f` galao) | Alto — lido do ASM `checkTile` subroutine |
| Scaffolding Phaser (config, scenes, tsconfig) | Alto — lido completamente |
| Hotfix a7db08a | Alto — correto e justificado |

### Gaps desta pass (nao cobertos)

- `patterns.chr` nao foi lido em bytes brutos — confiamos que as extractions batem com o binario. Uma pass futura poderia hexdump os primeiros 95 bytes a partir do offset 4096 e comparar manualmente com os campos do `fases_runtime.json`.
- `bgm_*.asm` e `sounds.asm` nao foram revisados (out of scope G0, pendencias listadas no ANALISE).
- `done.rle` e `title.rle` nao foram inspecionados.
- A correcao de `extract_palette.py` e `extract_levels.py` nao foi aplicada (regra: nao modificar fora de `qa/`). Os JSONs atualmente no repo tem os dados bugados.
- `01_mapeamento.txt` nao foi lido (estimativa de linhas por arquivo — baixo risco).
- Nao foi possivel executar os scripts Python para validar output ao vivo (shell negado).

---

## Para o QA da proxima sprint (G1, G2, G3, G4...)

### Contratos e invariantes da G0 que NAO podem ser violados

#### 1. Formato `fases_editor.json`

Cada entrada do array deve ter:
```typescript
{
  id: number,                          // 1..10
  largura_efetiva_tiles: number,       // 14 | 20 | 25 | 30
  altura_tiles: 11,                    // FIXO, sempre 11
  playable_tiles_total: number,        // largura_efetiva_tiles * 11
  spawn_jogador: {
    editor_x: number,                  // raw do levels.bin
    editor_y: number,                  // raw do levels.bin
    game_x: number,                    // editor_x + 1
    game_y: number,                    // editor_y + 3
  },
  grama_alta_para_cortar: number,      // count de tiles==1 na area playable
  fuel_inc_por_tile_8_8: number,       // ATENCAO: usa round(), valor correto esta em fases_runtime.json
  tiles: number[][],                   // [row][col], len(row)==largura_efetiva_tiles, rows==11
}
```

**IMPORTANTE**: O campo `fuel_inc_por_tile_8_8` em `fases_editor.json` usa `round()` e e **diferente** do valor real do jogo. Usar `meta_done_inc_8_8` de `fases_runtime.json` para valores autoritativos.

#### 2. Mapeamento de tile codes (editor -> semantico)

```
0 -> grama_cortada    (tile de chao, nao conta pro target)
1 -> grama_alta       (alvo de corte, conta pro done_cnt)
2 -> flores           (penalty fuel ao pisar)
3 -> pedra            (penalty maior + shake ao pisar)
```

Valores 4-7 podem aparecer mas NAO tem semantica definida no jogo original. Tratar como `grama_cortada` (valor 0) e a opcao mais segura.

#### 3. Dimensoes fixas

- Altura do mapa: **sempre 11 tiles** (invariante absoluto do NES original)
- Larguras validas: **14, 20, 25, 30** (correspondendo a fases 1-3, 4-5, 6-8, 9-10)
- Tile size NES metatile: **16x16 px** (= 4 tiles 8x8)
- Tile size port JS: **64x64 px** (= 4x do NES)
- Resolucao base: **1280x720** (20 tiles de largura visiveis, 11.25 de altura)

#### 4. Spawn do jogador

Coordenadas `game_x` / `game_y` em `fases_editor.json` ja incluem os offsets do editor (+1 em X, +3 em Y). Esses valores batem com `meta_player_x` / `meta_player_y` em `fases_runtime.json`. Nao aplicar offset duplo.

Todos os Y de spawn sao **8** (invariante empirico para as 10 fases do jogo original).

#### 5. Camera scroll

- Scroll **somente horizontal**, sem scroll vertical
- `GAME_CAM_MAX = (GAME_MAP_WDT - 14) * 16` pixels no NES
- Equivalente no port 4x: `GAME_CAM_MAX = (largura - 20) * 64` pixels (onde 20 = tiles visiveis em 1280px)
- Fases 1-3 (largura=14): sem scroll (fase cabe na tela inteira)
- Fases 4+ (largura>14): scroll necessario

#### 6. Paletas (STATUS: JSON PARCIALMENTE INCORRETO)

O `palettes.json` atual tem bug (P1 no relatorio): palTitle, palGameSprites e palGame tem 3 sub-paletas no JSON, mas o ASM original tem 4. Qualquer sprint que usar paletas diretamente do JSON deve ler o `palette.asm` ou aguardar correcao do script.

Sub-paletas faltando:
- `palTitle[3]`: `{$0f, $0b, $29, $30}` = `{#000000, #005800, #B8F818, #D8F878}`
- `palGameSprites[3]`: `{$0f, $0f, $00, $30}` = `{#000000, #000000, #7C7C7C, #D8F878}`
- `palGame[3]`: `{$0f, $0a, $10, $20}` = `{#000000, #005800, #A81000, #F8F8F8}`

#### 7. Scaffolding Phaser

- `GameConfig.ts` exporta `GAME_WIDTH=1280`, `GAME_HEIGHT=720`, `TILE_SIZE=64`, `COLORS` e `config`
- Scale mode: `Phaser.Scale.FIT` com `CENTER_BOTH`
- `pixelArt: true`, `roundPixels: true` — nao alterar sem revisao
- Cenas registradas em ordem: `[BootScene, TitleScene, GameScene]`

### Sinais de regressao a checar em cada sprint

1. **HUD em 100%**: Confirmar que a formula de tiles totais usa `Math.floor` em ambas as dimensoes (bug original usava `Math.ceil` em gridRows, corrigido em a7db08a).

2. **Tile counts batem**: Ao carregar uma fase, contar tiles de tipo 1 (grama alta) e comparar com `grama_alta_para_cortar` do JSON. Deve ser identico.

3. **Spawn position**: Posicao inicial do jogador em tiles deve ser exatamente `(game_x, game_y)` do JSON, nao `(editor_x, editor_y)`.

4. **Camera bounds**: Para fases com `largura_efetiva_tiles > 20`, a camera deve ser constrangida a `[0, (largura - 20) * 64]` pixels. Para fases <= 20 tiles, a camera nao deve scrollar.

5. **Sem scroll vertical**: Qualquer movimento de camera em Y e regressao. O jogo original nao tem scroll vertical.
