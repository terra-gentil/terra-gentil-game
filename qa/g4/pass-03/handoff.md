# Handoff G4 pass-03

---

## Validado nesta pass

- [x] Fix G4-01 (a67a26b) confirmado - SHUTDOWN chama clearFuelBarrel
- [x] Fix G4-02 (guards !gameOver antes de SFX/shake) confirmado
- [x] Fuel decay 1pt/500ms so em mov, cappedDelta=50ms, fuelDecAccumMs reseta init
- [x] FLOWERS -12 one-shot, STONE -25 mantem, shake(250,0.008) so !gameOver
- [x] FUEL_SPAWN_MS array confere, pickup=full refill, 1 por vez
- [x] Game over idempotente, congela mov, mensagem depth 2002, restart funciona
- [x] HUD depth 1000-1002 scrollFactor=0
- [x] init() reseta todos os campos G4 incluindo submitModalOpen (G8)
- [x] SHUTDOWN handler limpa input+timer+barrel
- [x] D-pad, tap, SPACE/ENTER, ESC respeitam submitModalOpen
- [x] Modal em game over: ordem sfx->msg->modal sem race; onSkipped 'gameOver' nao chama endRun

## Achados novos abertos (P3)

- G4-03: zerar fuelDecAccumMs em onPickupFuel (nice-to-have)
- G4-04: documentar invariante de restartLevel com modal aberto

## Pendentes persistentes

- Build TS, blink fuel<25%, runtime tests, mobile real, balance fases 6-10

---

## Para QA das proximas sprints (G9+)

### Contratos de G4 pra G9+

- Substituir SFX por OGG (G6.5): manter ordering "logica antes de SFX"
- Sprite Gentileza (G9): manter setDepth(10), reset anims em init
- Tilemap real (G9): trocar setFillStyle(GRASS_CUT) por API equivalente (setTileAt)
- Auto-restart timer hipotetico: nao chamar restartLevel com submitModalOpen=true
- Novos tile types: branch explicita com guard !gameOver se penalty
- Mudar FUEL_MAX/penalties: rebalancear FUEL_SPAWN_MS e thresholds 0.5/0.25
- Se G9 adicionar power-up de combustivel maximo: respeitar PENALTY_FLOWERS/PENALTY_STONE como dano absoluto, nao percentual

### Sinais de regressao

1. Mudancas em FUEL_DECAY_INTERVAL_MS - reavaliar P3 G4-03 (relevancia do reset).
2. Adicao de tile types com penalty: aplicar `if (!this.gameOver)` em SFX/shake.
3. Pickup de galao em fluxo novo (boss, cutscene): rever `clearFuelBarrel` no SHUTDOWN.
4. Pause modal: bloquear timers via `this.fuelSpawnTimer.paused = true` ou chamar `this.scene.pause`.

### Bugs novos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| G4-03 | G4 | P3 | ABERTO - fuelDecAccumMs nao zerado em onPickupFuel |
| G4-04 | G4 | P3 | ABERTO - invariante restartLevel com modal nao documentado |

### Bugs herdados ainda abertos

Nenhum P0/P1/P2 pendente em G4 (G4-01 e G4-02 fechados).
