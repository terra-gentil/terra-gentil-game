# QA G2 pass-04 - Relatorio de Revisao

**Sprint**: G2 - Engine core (carrega fase_01, render real, snap-to-grid, corte por tipo)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G2 pass-04
**HEAD analisado**: ad71970
**Commits revisados**: c1a9b6a (G2 base), a7db08a (HUD 100% fix)
**Build validado**: nao (analise estatica)

---

## Cobertura

Releitura completa de:
- `jogo/src/scenes/GameScene.ts` (engine core: render, snap-to-grid, cut por tipo)
- `jogo/src/scenes/BootScene.ts` (preload niveis.json)
- `jogo/src/types/Level.ts` (LevelJson, TILE consts)
- `jogo/public/assets/maps/niveis.json` (formato e contrato)
- `jogo/src/config/Constants.ts` (TILE_SIZE=64, GAME_WIDTH=1280, COLORS)

---

## Linhas atualizadas (deltas vs pass-03)

| Contrato | pass-03 (aa2633a) | pass-04 (ad71970) |
|----------|-------------------|-------------------|
| dt cap 50ms | GameScene.ts:402 | GameScene.ts:413 |
| pct clamp 100 | GameScene.ts:523 | GameScene.ts:541 |
| Deep clone | GameScene.ts:157 | GameScene.ts:161 |
| Snap-to-grid Math.sign | GameScene.ts:444-446 | GameScene.ts:454-457 |
| cutTileAt | GameScene.ts:511-514 | GameScene.ts:528-537 |
| Spawn editor_x/y | - | GameScene.ts:204-205 |

Mudanca de linhas decorre de imports novos (`RunStats`, `SubmitModal`), campo `submitModalOpen`, `enterLevel`/`recordCut` e mudanca de import de `GameConfig` para `Constants`.

---

## Verificacoes realizadas

1. dt cap em 50ms - OK (`GameScene.ts:413`)
2. pct clamp 100 - OK (`GameScene.ts:541`)
3. Deep clone do cache JSON - OK (`GameScene.ts:161`)
4. Snap-to-grid por flip de Math.sign - OK (`GameScene.ts:454-457`)
5. pendingDir promovido a dir so no centro do tile - OK (`GameScene.ts:468-474`)
6. Trava em NONE em colisao - OK (`GameScene.ts:441-446`)
7. canEnter so checa bounds (NAO bloqueia STONE) - OK (`GameScene.ts:485-490`)
8. cutCount incrementa apenas em TALL via cutTileAt - OK (`GameScene.ts:528-537`)
9. FLOWERS one-shot vira CUT sem incrementar cutCount - OK (`GameScene.ts:502-509`)
10. STONE penaliza sem mudar tile (re-penalty intencional) - OK (`GameScene.ts:510-517`)
11. Spawn usa editor_x/editor_y direto - OK (`GameScene.ts:204-205`)
12. Schema LevelJson casa com niveis.json - OK (`Level.ts:12-27`)
13. TILE codes 0..3 batem com tiles_legenda do JSON - OK (`Level.ts:3-8`)
14. Constants.ts: GAME_WIDTH=1280, GAME_HEIGHT=720, TILE_SIZE=64 - OK
15. BootScene preload niveis.json key='niveis' - OK (`BootScene.ts:9`)
16. submitModalOpen guards em todos handlers de input - OK (228, 250, 256, 374)
17. SHUTDOWN cleanup completo (pointer, kb, timer, fuelBarrel) - OK (`GameScene.ts:266-273`)

---

## Achados

### P3-G2-01 - worldOffsetX() recalculado a cada tileToPx()

**Arquivo**: jogo/src/scenes/GameScene.ts (cosmetico, arrastado de pass-02)

`worldOffsetX()` e funcao pura mas chamada inline em todos os `tileToPx()`. Cache trivial possivel.

**Severidade**: P3 - cosmetico, sem impacto.

### P3-G2-02 - TileType admite 0..7 mas runtime so usa 0..3

**Arquivo**: jogo/src/types/Level.ts:8

`type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7` mas runtime so trata 0..3. Tile types 4..7 caem em fallback cinza e passam como CUT (sem bloquear/penalizar/contar).

**Severidade**: P3 - sem risco hoje, mas ponto de atencao se G9 adicionar tile types novos sem branch dedicada.

---

## Itens fechados

- P2 STONE re-penalty: explicitamente listado em HANDOFF.md "Trade-offs aceitos" item 1 - INTENCIONAL (fidelidade NES). Fechado definitivamente
- P2 grama_alta_para_cortar fases 3-10: validado em pass-03, niveis.json nao mudou
- P3 SHUTDOWN cleanup fuelBarrel: ja resolvido em pass-03

---

## Regressoes G7/G7.5/G8 sobre G2

- `enterLevel` (`GameScene.ts:163`) e `recordCut` (`GameScene.ts:532`) sao side-effects puros via RunStats
- `submitModalOpen` adicionado a todos handlers existentes - nenhum handler omite o guard
- `showSubmitModal(this.allLevels, ...)` passa cache direto, mas modal so le (sem mutacao)
- Mudanca de `GameConfig` para `Constants` em imports nao alterou semantica
- Skip de `sfx.penaltyFlowers/penaltyStone` e `camera.shake` quando penalty disparou gameOver e melhoria UX, nao quebra contrato

---

## Resumo

| Severidade | Total |
|---|---|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| P3 | 2 |

Sprint G2 robusta, sem fixes urgentes. Manter politica de QA on-demand.
