# Relatorio QA — Sprint G2 (Engine Core) — pass-03

| Campo    | Valor                        |
|----------|------------------------------|
| Commit   | aa2633a                      |
| Reviewer | Sub-agente Sonnet G2 pass-03 |
| Data     | 2026-04-30                   |

---

## 1. Contratos do Engine Core — Verificacao em HEAD (aa2633a)

### 1.1 dt cap 50ms

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:402`

```typescript
const cappedDelta = Math.min(delta, 50);
```

**Status: OK.** Identico ao verificado em pass-02 (linha 396 mudou para 402 por insercao de codigo G6, mas a logica e invariante).

---

### 1.2 pct clamp 100

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:523`

```typescript
const pct = Math.min(100, Math.round((this.cutCount / target) * 100));
```

**Status: OK.** Clamp presente e correto.

---

### 1.3 Deep clone do JSON (cache nao mutado)

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:157`

```typescript
this.level = JSON.parse(JSON.stringify(this.allLevels[this.levelIndex])) as LevelJson;
```

**Status: OK.** `this.allLevels` (cache Phaser) nunca e mutado diretamente. Toda mutacao de tiles ocorre em `this.level`, que e copia independente.

---

### 1.4 Level type — `LevelJson`, `TILE`, `TileType`

**Arquivo:** `jogo/src/types/Level.ts`

| Elemento          | Status |
|-------------------|--------|
| `TileType = 0\|1\|2\|3\|4\|5\|6\|7` | OK — nenhum sprint modificou este arquivo |
| `TILE.CUT=0, TALL=1, FLOWERS=2, STONE=3` | OK |
| `LevelJson` interface completa | OK |
| `AllLevelsJson = LevelJson[]` | OK |

**Status: OK.** Arquivo intacto.

---

### 1.5 Snap-to-grid

**Arquivo:linhas:** `jogo/src/scenes/GameScene.ts:444–446`

```typescript
const reached =
  (v.x !== 0 && Math.sign(targetCx - oldPx) !== Math.sign(targetCx - newPx)) ||
  (v.y !== 0 && Math.sign(targetCy - oldPy) !== Math.sign(targetCy - newPy)) ||
  (this.player.x === targetCx && this.player.y === targetCy);
```

**Status: OK.** Algoritmo de deteccao de cruzamento por `Math.sign` e snap exato inalterado.

**Snap na linha 449–452:**
```typescript
this.player.x = targetCx;
this.player.y = targetCy;
this.playerTileX = targetTileX;
this.playerTileY = targetTileY;
```
Correto. `playerTileX/Y` atualiza antes de `onEnterTile`.

---

## 2. Verificacao das chamadas sfx.* adicionadas por G6

G6 adicionou chamadas `sfx.*()` em quatro contextos de `GameScene`. Verificacao de que sao puramente colaterais:

### 2.1 `onEnterTile` — sfx.cut(), sfx.penaltyFlowers(), sfx.penaltyStone()

**Arquivo:linhas:** `GameScene.ts:481–500`

```typescript
private onEnterTile(tx: number, ty: number): void {
    if (this.fuelBarrel && ...) {
        this.onPickupFuel();
        return;
    }
    const type = this.level.tiles[ty][tx];
    if (type === TILE.TALL) {
        this.cutTileAt(tx, ty);   // <-- logica primeiro
        sfx.cut();                // <-- sfx depois, standalone
    } else if (type === TILE.FLOWERS) {
        this.applyFuelPenalty(PENALTY_FLOWERS);  // logica
        this.level.tiles[ty][tx] = TILE.CUT;     // logica
        this.tileGrid[ty][tx].setFillStyle(...);  // visual
        sfx.penaltyFlowers();                     // sfx depois
    } else if (type === TILE.STONE) {
        this.applyFuelPenalty(PENALTY_STONE);     // logica
        this.cameras.main.shake(250, 0.008);      // visual
        sfx.penaltyStone();                       // sfx depois
    }
}
```

**Analise:**
- `sfx.cut()`: chamada apos `cutTileAt()` (que muta tile, incrementa `cutCount`, chama `updateHud()`, e pode chamar `onLevelClear()`). O valor de retorno e `void`; nao e usado em nenhuma condicao ou atribuicao. Puramente colateral.
- `sfx.penaltyFlowers()`: chamada apos toda logica de penalidade e mutacao de tile. Retorno `void`, nao usado. Puramente colateral.
- `sfx.penaltyStone()`: chamada apos penalidade e camera shake. Retorno `void`, nao usado. Puramente colateral.

**Status: OK — sem impacto na logica.**

---

### 2.2 `onPickupFuel` — sfx.fuelPickup()

**Arquivo:linhas:** `GameScene.ts:588–597`

```typescript
private onPickupFuel(): void {
    if (!this.fuelBarrel) return;
    this.fuel = FUEL_MAX;
    this.updateFuelBar();
    this.fuelBarrel.tween.stop();
    this.fuelBarrel.sprite.destroy();
    this.fuelBarrel = undefined;
    this.scheduleFuelSpawn();
    sfx.fuelPickup();   // <-- ultimo statement, apos toda logica
}
```

**Analise:** `sfx.fuelPickup()` e o ultimo statement do metodo. Todo o estado de jogo (`fuel`, `fuelBarrel`, timer de spawn) ja foi atualizado antes da chamada. Retorno `void`. Puramente colateral.

**Status: OK — sem impacto na logica.**

---

### 2.3 `onLevelClear` — sfx.levelClear()

**Arquivo:linhas:** `GameScene.ts:606–631`

```typescript
private onLevelClear(): void {
    this.levelCleared = true;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.fuelSpawnTimer?.remove();
    this.clearFuelBarrel();
    sfx.levelClear();   // <-- chamado apos flags de estado e cleanup
    const isLast = ...;
    const msg = ...;
    this.centerMessage = this.add.text(...);
    ...
}
```

**Analise:** `sfx.levelClear()` e chamado apos `levelCleared=true`, zeramento de direcao e cleanup de recursos. O que vem depois (construcao da mensagem central) e puramente visual. Retorno `void`. O guard `if (this.levelCleared || this.gameOver) return` no `update()` ja esta ativo antes de qualquer frame subsequente.

**Status: OK — sem impacto na logica.**

---

### 2.4 `triggerGameOver` — sfx.gameOver()

**Arquivo:linhas:** `GameScene.ts:633–661`

```typescript
private triggerGameOver(): void {
    if (this.gameOver) return;   // guard de idempotencia
    this.gameOver = true;
    this.dir = 'NONE';
    this.pendingDir = 'NONE';
    this.fuelSpawnTimer?.remove();
    this.clearFuelBarrel();
    sfx.gameOver();   // <-- chamado apos flags e cleanup
    this.centerMessage = ...;
    ...
}
```

**Analise:** `sfx.gameOver()` e chamado apos `gameOver=true`, zeramento de direcao e cleanup. O guard de idempotencia `if (this.gameOver) return` garante que nao ha chamada dupla. Retorno `void`. Puramente colateral.

**Status: OK — sem impacto na logica.**

---

### 2.5 SfxPlayer — interface e estado

**Arquivo:** `jogo/src/audio/SfxPlayer.ts`

`SfxPlayer` expoe apenas:
- `setMuted(m: boolean): void` — chamado em `init()` (linha 146), sem efeito na logica do jogo.
- Metodos de som: todos retornam `void`.
- Estado interno: `muted: boolean` e `ctx?: AudioContext` — nenhum interage com `GameScene`.

O singleton `sfx` e importado e usado como side-effect puro. Nao ha acoplamento de estado entre `SfxPlayer` e `GameScene`.

**Status: OK — G6 nao alterou logica do engine core.**

---

## 3. Validacao `grama_alta_para_cortar` vs contagem real de TALL — Fases 3–10

**Arquivo:** `jogo/public/assets/maps/niveis.json`

Contagem manual de tiles com valor `1` (TALL) em cada linha de cada fase, comparada ao campo `grama_alta_para_cortar`:

| Fase | Dimensao   | TALL contados | grama_alta_para_cortar | Resultado |
|------|------------|---------------|------------------------|-----------|
| 3    | 14x11      | 122           | 122                    | **OK**    |
| 4    | 20x11      | 183           | 183                    | **OK**    |
| 5    | 20x11      | 173           | 173                    | **OK**    |
| 6    | 25x11      | 247           | 247                    | **OK**    |
| 7    | 25x11      | 190           | 190                    | **OK**    |
| 8    | 25x11      | 221           | 221                    | **OK**    |
| 9    | 30x11      | 247           | 247                    | **OK**    |
| 10   | 30x11      | 248           | 248                    | **OK**    |

**Conclusao: Todas as 8 fases verificadas apresentam contagem exata de tiles TALL igual ao target.** Nenhum risco de fase nunca completar ou completar antecipadamente.

**P2 de pass-02 fechado: RESOLVIDO (sem mismatch em nenhuma fase 3–10).**

---

## 4. Resumo de Status dos Contratos em aa2633a

| Contrato                            | Linha em HEAD    | Status  |
|-------------------------------------|------------------|---------|
| `dt` cap 50ms                       | `GameScene.ts:402` | OK    |
| `pct` clamp 100                     | `GameScene.ts:523` | OK    |
| Deep clone cache                    | `GameScene.ts:157` | OK    |
| `Level.ts` (tipos, TILE, LevelJson) | `Level.ts:1–27`    | OK    |
| Snap-to-grid (`Math.sign`)          | `GameScene.ts:444–446` | OK |
| `tiles[row][col]` row-major         | `GameScene.ts:184,487` | OK |
| `cutCount` so sobe em TALL          | `GameScene.ts:511–514` | OK |
| `sfx.*()` puramente colaterais (G6) | `GameScene.ts:490,495,499,596,612,640` | OK |
| `grama_alta_para_cortar` fases 3–10 | `niveis.json`      | OK (todos) |

---

## 5. Itens Abertos (herdados de pass-02, sem alteracao)

### P2 — STONE penalidade repetida por repassagem

Comportamento a confirmar com design. STONE nao e alterado para TILE.CUT apos penalidade. Cada repassagem aplica -25 fuel. Ver `GameScene.ts:496–499`.

### P3 — Tween do fuelBarrel nao parado no SHUTDOWN

`clearFuelBarrel()` ja esta presente no handler SHUTDOWN (linha 263). Item de pass-02 foi registrado como robustez — verificado: `clearFuelBarrel()` esta no SHUTDOWN. **Este item pode ser fechado.**

> Verificacao adicional: linha 261–263:
> ```typescript
> this.fuelSpawnTimer?.remove();
> this.clearFuelBarrel();
> ```
> Presente no `events.once(SHUTDOWN, ...)`. O P3 de pass-02 era hipotetico — ja estava implementado.

### P3 — `worldOffsetX()` nao cacheado

Sem impacto funcional. Melhoria cosmética para sprint futura.
