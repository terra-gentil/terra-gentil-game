# Handoff — Sprint G2 (Engine Core) — pass-03

| Campo    | Valor                        |
|----------|------------------------------|
| Commit   | aa2633a                      |
| Reviewer | Sub-agente Sonnet G2 pass-03 |
| Data     | 2026-04-30                   |

---

## Status dos Contratos G2 em HEAD (aa2633a)

Todos os contratos do engine core definidos em pass-01 e reconfirmados em pass-02 continuam intactos em HEAD.

### Contratos verificados em pass-03

| Contrato                            | Arquivo:linha            | Status |
|-------------------------------------|--------------------------|--------|
| `dt` cap 50ms                       | `GameScene.ts:402`       | OK     |
| `pct` clamp 100                     | `GameScene.ts:523`       | OK     |
| Deep clone cache                    | `GameScene.ts:157`       | OK     |
| `Level.ts` (tipos, TILE, LevelJson) | `Level.ts:1–27`          | OK     |
| Snap-to-grid (`Math.sign` flip)     | `GameScene.ts:444–446`   | OK     |
| `tiles[row][col]` row-major         | `GameScene.ts:184,487`   | OK     |
| `cutCount` so sobe em TALL          | `GameScene.ts:511–514`   | OK     |

---

## G6 — sfx.* sao puramente colaterais

As chamadas adicionadas por G6:

| Chamada              | Linha | Contexto                         | Colateral? |
|----------------------|-------|----------------------------------|------------|
| `sfx.cut()`          | 490   | Apos `cutTileAt()` completo      | Sim        |
| `sfx.penaltyFlowers()` | 495 | Apos penalidade + mutacao tile   | Sim        |
| `sfx.penaltyStone()` | 499   | Apos penalidade + camera shake   | Sim        |
| `sfx.fuelPickup()`   | 596   | Ultimo stmt de `onPickupFuel()`  | Sim        |
| `sfx.levelClear()`   | 612   | Apos `levelCleared=true` + cleanup | Sim      |
| `sfx.gameOver()`     | 640   | Apos `gameOver=true` + cleanup   | Sim        |

`SfxPlayer.sfx` e singleton com estado isolado (`muted`, `AudioContext`). Todos os metodos retornam `void`. Nenhuma chamada precede a logica que deveria preceder ou e usada em condicao/atribuicao.

**Conclusao: G6 nao violou nenhum contrato do engine core G2.**

---

## P2 — grama_alta_para_cortar vs contagem TALL — FECHADO

Contagem manual de todos os tiles com valor `1` em `niveis.json` para as fases 3–10:

| Fase | TALL real | Target | Match |
|------|-----------|--------|-------|
| 3    | 122       | 122    | OK    |
| 4    | 183       | 183    | OK    |
| 5    | 173       | 173    | OK    |
| 6    | 247       | 247    | OK    |
| 7    | 190       | 190    | OK    |
| 8    | 221       | 221    | OK    |
| 9    | 247       | 247    | OK    |
| 10   | 248       | 248    | OK    |

**Nenhum mismatch encontrado. Item P2 de pass-02 encerrado.**

---

## P3 — SHUTDOWN cleanup fuelBarrel — FECHADO

Pass-02 registrou como hipotetico risco que `clearFuelBarrel()` nao estaria no SHUTDOWN. Verificacao em HEAD (linha 261–263) confirma que ja estava implementado:

```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  ...
  this.fuelSpawnTimer?.remove();
  this.clearFuelBarrel();   // presente
});
```

**Item encerrado.**

---

## Itens Abertos para Sprint Futura

### P2 — STONE penalidade repetida por repassagem

**Arquivo:linha:** `GameScene.ts:496–499`

STONE nao muta para TILE.CUT apos penalidade. Cada repassagem pelo mesmo tile aplica -25 fuel. Confirmar com design se intencional. Se nao, adicionar `this.level.tiles[ty][tx] = TILE.CUT` apos penalidade (como FLOWERS faz).

### P3 — `worldOffsetX()` nao cacheado

**Arquivo:linha:** `GameScene.ts:379–381`

Calculado a cada `tileToPx()` durante `update()`. Valor constante para a vida da cena. Sem impacto real na performance atual.

---

## Para QA das Sprints G7+ (Contratos Nao Violar)

Os contratos de pass-02 continuam validos na integra. Adicionalmente, para sprints que tocarem audio:

### Contrato SfxPlayer (G6)

1. **`sfx.*()` sao fire-and-forget** — nunca usar valor de retorno, nunca chamar antes da logica de jogo correspondente.
2. **`sfx.setMuted()`** so deve ser chamado em `init()`, apos `getSettings()`. Se novos modos de mute forem adicionados, usar o mesmo padrao.
3. **`SfxPlayer` e singleton** (`sfx` exportado de `SfxPlayer.ts`). Nao instanciar nova copia em GameScene ou outras cenas.
4. **AudioContext e lazy** — nao forcar criacao antecipada de `AudioContext`. A politica de auto-play dos browsers exige user gesture antes do primeiro som.
5. **Quando assets OGG forem disponibilizados** (exportados do FamiStudio), substituir `playTone()` por `this.sound.play(key)` via Phaser sound manager. O contrato de chamada em GameScene nao muda.

### Invariantes G2 confirmados intactos (aa2633a)

1. `tiles[row][col]` — sempre row-major.
2. `spawn_jogador.editor_x/editor_y` — coordenadas de tile, nao pixel.
3. `cutCount` so incrementa em TALL.
4. `grama_alta_para_cortar` == contagem real de TALL em JSON (validado fases 1–10).
5. `TILE_SIZE = 64` consistente (`GameConfig.ts:9`).
6. Cache Phaser nunca mutado diretamente — sempre deep-clone.
7. Guard de estado terminal (`gameOver`, `levelCleared`) em todos os handlers de input.
8. `SHUTDOWN` cleanup completo: pointer, keyboard, timer, tween/barrel.
