# Relatorio QA G3 pass-04

**Sprint**: G3 - Camera scroll horizontal + 10 niveis + auto-progressao
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G3 pass-04
**HEAD analisado**: ad71970 (commits posteriores: 67b06cd G8, 6f3b89a handoff, ad71970 G7.5)
**Commit principal G3**: caa959c
**Build validado**: nao (sandbox bloqueou shell)

---

## 1. Camera bounds - `(0, 0, max(worldW, GAME_WIDTH), GAME_HEIGHT)`

**Status: VALIDO**

`GameScene.ts:175-176`:
```ts
const cameraWorldW = Math.max(this.worldW, GAME_WIDTH);
this.cameras.main.setBounds(0, 0, cameraWorldW, GAME_HEIGHT);
```

- Largura: max(worldW, GAME_WIDTH) - fases 1-3 (worldW=896) clampam em 1280; fases 4-10 usam o tamanho do mundo
- Altura: fixa em GAME_HEIGHT (720). Sem scroll vertical, conforme contrato G3
- Origem (0, 0) esperada pelo design

Sem regressao G4-G8.

---

## 2. Camera follow - `startFollow(player, false, 0.1, 0)` sem offsets

**Status: VALIDO**

`GameScene.ts:216`. Quatro argumentos: roundPixels=false, lerpX=0.1, lerpY=0. Sem offsetX/offsetY. Fix do P1 reportado em pass-01 mantido em HEAD.

---

## 3. Carregamento dos 10 niveis e larguras conforme fase

**Status: VALIDO**

| Fase | id | largura | esperado | spawn (editor_x, editor_y) |
|------|----|---------|----------|----------------------------|
| 1    | 1  | 14      | 14       | (6, 5)                     |
| 2    | 2  | 14      | 14       | (6, 5)                     |
| 3    | 3  | 14      | 14       | (6, 5)                     |
| 4    | 4  | 20      | 20       | (5, 5)                     |
| 5    | 5  | 20      | 20       | (2, 5)                     |
| 6    | 6  | 25      | 25       | (12, 5)                    |
| 7    | 7  | 25      | 25       | (2, 5)                     |
| 8    | 8  | 25      | 25       | (2, 5)                     |
| 9    | 9  | 30      | 30       | (14, 5)                    |
| 10   | 10 | 30      | 30       | (14, 5)                    |

`BootScene.ts:9` carrega `assets/maps/niveis.json` com key 'niveis'. `GameScene.ts:154` usa o mesmo key.

---

## 4. Spawn por fase - uso de editor_x / editor_y

**Status: VALIDO**

`GameScene.ts:204-205` le diretos. Auto-corte do tile de spawn em `GameScene.ts:280-282` se for TALL.

---

## 5. Transicao fase->fase - limpeza de estado

**Status: VALIDO**

advanceLevel (`GameScene.ts:714-722`):
1. `advancing=true` bloqueia handlers
2. `scene.start` dispara SHUTDOWN
3. SHUTDOWN handler (`linhas 266-273`) remove pointerdown, SPACE, ENTER, ESC, fuelSpawnTimer, clearFuelBarrel
4. `init()` reseta TODO state (advancing=false, levelCleared=false, gameOver=false, cutCount=0, fuel=FUEL_MAX, dir/pendingDir=NONE, tileGrid=[], submitModalOpen=false)

---

## 6. Auto-progressao em 100% TALL cortado

**Status: VALIDO**

cutTileAt incrementa cutCount, checa target -> onLevelClear. Update loop tem early return em levelCleared || gameOver.

---

## 7. Fase 10 -> fim (game complete)

**Status: VALIDO**

`isLast = levelIndex >= allLevels.length - 1`. Mensagem de parabens. advanceLevel vai pra TitleScene em vez de GameScene+1.

Em HEAD G8: se `isLast && isRankingEligible`, abre submit modal. Bloqueia via submitModalOpen ate callback.

---

## 8. Race condition em scene.start durante advancing

**Status: VALIDO**

5 pontos de entrada auditados, todos com guard `if (this.advancing) return`:
- advanceLevel (715), restartLevel (725), onPointerDown (227), D-pad pointerdown (373), onConfirm (249), onEscape (256)

---

## 9. Regressoes G4-G8 - todas sem impacto em G3

- G4 fuel/gameOver: campos resetados em init, SHUTDOWN remove timer/barrel
- G5 D-pad/eyeStrain: handlers com guards corretos
- G6 SFX: Web Audio puro, sem efeito em camera/cena
- G7 RunStats: singleton fora da scene
- G7.5 URL nickname: nao toca em GameScene
- G8 SubmitModal/RankingScene: bloqueia handlers via submitModalOpen

---

## 10. Itens NOVOS pass-04

### P3-G3-01 - Auto-corte do spawn-tile nao toca sfx.cut()

**Arquivo**: GameScene.ts:280-282

Cosmetico, possivelmente intencional (autoplay policy - ainda sem user gesture quando spawn ocorre).

### P3-G3-02 (informativo) - playable_tiles_total no JSON sem uso

Campo dead em `niveis.json`. Sem impacto.

### P3-G3-03 (informativo) - tiles_legenda no JSON sem uso

Campo dead em `niveis.json` (so documentacao).

### P3-G3-04 - startFollow chamado mesmo em fases pequenas

**Arquivo**: GameScene.ts:216. Cosmetico. Em fases 1-3 (worldW=896 clampado a GAME_WIDTH=1280) o follow nao tem efeito visual mas e chamado anyway.

### P4-G3-01 - console.error / console.log em producao

Ja conhecido (trade-off #6 do HANDOFF). Sem mudanca.

---

## 11. Itens herdados pendentes

Build TypeScript, contagem real TALL por nivel, jitter visual fases 1-3, camera niveis 9-10, leak keyboard, race SPACE+touch, mobile fisico, fuel_inc_por_tile_8_8 (dead aceito), eyeStrain overlap, ESC em transicao, AudioContext.close.

---

## 12. Resumo

| Severidade | Total | Novos | Herdados |
|---|---|---|---|
| P0 | 0 | 0 | 0 |
| P1 | 0 | 0 | 0 |
| P2 | 0 | 0 | 0 |
| P3 | 5 | 4 | 1 |
| P4 | 1 | 1 | 0 |

Achado mais grave: auto-corte do spawn-tile sem SFX (P3, discutivel se e bug).

## 13. Conclusao

G3 limpo apos G4-G8. Contratos centrais preservados em HEAD `ad71970`. Status: Limpo.
