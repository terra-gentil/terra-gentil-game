# Handoff G2 pass-04

---

## Para reverificacao desta sprint (G2 pass-05+)

### Validado nesta rodada

- [x] dt cap em 50ms preservado em `GameScene.ts:413`
- [x] Deep clone JSON.parse(JSON.stringify) em `GameScene.ts:161`
- [x] Snap-to-grid por Math.sign em `GameScene.ts:454-457`
- [x] pendingDir promovido so no centro do tile em `GameScene.ts:468-474`
- [x] Trava em NONE em colisao em `GameScene.ts:441-446`
- [x] canEnter checa bounds, NAO bloqueia STONE em `GameScene.ts:485-490`
- [x] cutCount incrementa apenas em TALL em `GameScene.ts:528-537`
- [x] FLOWERS one-shot em `GameScene.ts:502-509`
- [x] STONE re-penalty (mantem tile, fidelidade NES) em `GameScene.ts:510-517`
- [x] Spawn usa editor_x/y direto em `GameScene.ts:204-205`
- [x] Schema `LevelJson` casa com `niveis.json`
- [x] TILE codes 0..3 batem com `tiles_legenda`
- [x] BootScene preload key='niveis' em `BootScene.ts:9`
- [x] `submitModalOpen` guards em todos handlers (228, 250, 256, 374)
- [x] SHUTDOWN cleanup completo em `GameScene.ts:266-273`

### Gaps abertos

- [ ] Build TypeScript nao executado (sandbox)
- [ ] Validacao real em hardware mobile pendente (politica)

---

## Para QA das proximas sprints (G9+)

### Invariantes G2 estabelecidos

#### Engine core (`GameScene.ts`)

- `dt` capado em 50ms - protege snap em lag spikes. NAO remover.
- Deep clone do cache JSON - levels nao podem mutar entre runs.
- Snap-to-grid: dir/pendingDir, com `Math.sign(novo) !== Math.sign(antigo)` indicando passada pelo centro.
- Trava em `dir = 'NONE'` em colisao - exige novo input pra retomar.
- `canEnter` checa apenas bounds. STONE nao bloqueia (penaliza, fidelidade NES).
- `cutTileAt` e o UNICO ponto de incremento de `cutCount` - so para TALL.
- FLOWERS one-shot: vira CUT, sem cutCount, sem re-penalty.
- STONE re-penalty: tile mantem STONE, pode penalizar varias vezes (fidelidade NES).
- Spawn usa `editor_x/editor_y` direto da JSON - NAO `game_x/game_y` (offset NES).

#### Tipos (`types/Level.ts`)

- `TileType` admite 0..7 mas runtime so trata 0..3. Se G9+ adicionar tipo novo, criar branch explicita em `cutTileAt` (nao confiar no fallback CUT).
- `LevelJson` campos PT-BR (largura_efetiva_tiles, grama_alta_para_cortar etc) preservados pra audit trail.

### Sinais de regressao a monitorar em G9+

1. **Se G9 substituir Phaser.GameObjects.Rectangle por sprite real**: tileGrid setFillStyle/setData podem mudar pra setTexture/setFrame. Manter tileToPx/tileToPy com origem 0.5.
2. **Se G9 adicionar power-ups com cuts gratis**: garantir `recordCut` 1x por tile (P1-01 do G8 fica pior se nao).
3. **Se G9 mudar TILE_SIZE**: `Constants.ts` e bounds da camera precisam recalcular.
4. **Se G9 ampliar `TileType` 4..7**: implementar branch dedicada em `cutTileAt`. Nao confiar no fallback CUT.
5. **Se G10 mudar `dt` cap**: rerodar testes de snap em lag spike.

### Bugs novos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P3-G2-01 | G2 | P3 | ABERTO - worldOffsetX() recalculado a cada tileToPx (cosmetico) |
| P3-G2-02 | G2 | P3 | ABERTO - TileType admite 0..7 mas runtime so usa 0..3 |

### Bugs herdados ainda abertos

Nenhum P0/P1/P2 pendente em G2.
