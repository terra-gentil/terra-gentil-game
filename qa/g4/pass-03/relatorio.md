# Relatorio QA G4 pass-03

**Sprint**: G4 - Game loop completo (combustivel, penalty, galao, game over)
**Data**: 2026-04-30
**Reviewer**: Sub-agente Sonnet G4 pass-03
**HEAD analisado**: ad71970
**Commit principal G4**: 7d2993c
**Build validado**: nao (sandbox)

---

## Cobertura

Releitura completa de:
- `jogo/src/scenes/GameScene.ts` (FUEL_MAX, FUEL_DECAY_INTERVAL_MS, PENALTY_FLOWERS, PENALTY_STONE, FUEL_SPAWN_MS, fuel barrel pickup, game over flow)
- `jogo/src/ui/SubmitModal.ts` (interacao com game over, ordering modal vs sfx)
- `jogo/src/state/RunStats.ts` (cuts/level tracking)
- `jogo/src/audio/SfxPlayer.ts` (gameOver SFX)

---

## Findings

| ID | Sev | Linha | Resumo |
|----|-----|-------|--------|
| G4-01 | ~~P1~~ | GameScene.ts:266-273 | RESOLVIDO em a67a26b - SHUTDOWN agora chama clearFuelBarrel() |
| G4-02 | ~~P2~~ | GameScene.ts:506-516 | RESOLVIDO - guards `if (!this.gameOver)` antes de SFX/shake nas branches FLOWERS e STONE |
| G4-03 | P3 | GameScene.ts:606-615 | `fuelDecAccumMs` nao e zerado em `onPickupFuel()` |
| G4-04 | P3 | GameScene.ts:724-728 | Invariante implicito nao documentado: `restartLevel`/`advanceLevel`/`endRun` nao devem rodar com `submitModalOpen=true` |

---

## Verificacoes positivas

- FUEL_MAX=100, FUEL_DECAY_INTERVAL_MS=500, PENALTY_FLOWERS=12, PENALTY_STONE=25, FUEL_SPAWN_MS array - todos conferem com HANDOFF
- Decay so quando `dir !== 'NONE'`. `cappedDelta=min(delta,50)`
- FLOWERS one-shot (vira CUT). STONE mantem (re-penalty repete)
- Camera shake `(250, 0.008)` so se `!this.gameOver`
- Galao pickup full refill (fuel=FUEL_MAX), 1 por vez, exclui tile do player, reagenda apos pickup
- Game over: idempotente, congela mov (dir=NONE), update returns cedo, mensagem em depth 2002, restart via SPACE/ENTER/touch/D-pad
- HUD em depth 1000-1002 com `scrollFactor=0`
- `init()` reseta TODOS os campos G4 (incluindo `submitModalOpen` da G8)
- D-pad, tap-to-move, onConfirm e onEscape todos respeitam `submitModalOpen` antes de disparar acao
- SubmitModal em game over: ordem sequencial sfx -> centerMessage -> modal, sem race
- onSkipped em caso 'gameOver' nao chama endRun (intencional)

---

## Detalhamento dos achados novos

### G4-03 (P3) - fuelDecAccumMs nao zerado em onPickupFuel()

**Arquivo**: GameScene.ts:606-615

Apos pickup do galao, `fuel` retorna a FUEL_MAX, mas `fuelDecAccumMs` mantem o valor acumulado. Se o acumulador estava perto do limite (~480ms acumulados), o proximo decay roda em <500ms e o player perde 1pt em <500ms apos pickup.

**Impacto**: cosmetico, perdas de 1pt sao raras de notar.

### G4-04 (P3) - invariante implicito nao documentado

**Arquivo**: GameScene.ts:724-728

`restartLevel`, `advanceLevel` e `endRun` nao devem rodar com `submitModalOpen=true`. Hoje funciona porque os caminhos de chamada gateiam pelo modal callback. Se G9+ adicionar nova rota (ex: pause + retry), pode quebrar.

**Sugestao**: adicionar guard explicito `if (this.submitModalOpen) return` no inicio dessas funcoes.

---

## Resumo

| Severidade | Total |
|---|---|
| P0 | 0 |
| P1 | 0 |
| P2 | 0 |
| P3 | 2 |

Sprint G4 estavel. Fixes da pass-01 (G4-01 SHUTDOWN+clearFuelBarrel) e pass-02 (G4-02 guards !gameOver) confirmados em codigo. Regressoes G5/G6/G7.5/G8 todas gateadas pelos flags submitModalOpen/advancing/gameOver/levelCleared. Nada bloqueante novo.
