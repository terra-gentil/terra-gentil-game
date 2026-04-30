# QA G4 pass-01 — Relatorio de Revisao

**Revisor**: Sub-agente Sonnet (QA pass-01)
**Data**: 2026-04-30
**HEAD**: `d484e11`
**Commits revisados**: `7d2993c` (G4 principal) + `5bcf397` (qa-fixes: cappedDelta, pct clamp, advancing flag, event cleanup, camera fix)
**Arquivo principal**: `jogo/src/scenes/GameScene.ts`

---

## Sumario executivo

A G4 entregou um game loop funcional e correto na maior parte. Os mecanismos de fuel decay, penalty, spawn de galao e game over estao bem arquitetados. Foram encontrados **1 bug P1** (sprite do galao permanece ao SHUTDOWN sem cleanup do tween/sprite), **1 bug P2** (barrel pode spawnar em tile ja ocupado pelo corte do proximo frame — race window pequena), **1 lacuna de balance P2** (nivel 6-10 potencialmente injogavel sem galao — fuel esgota antes de completar), e varios itens P3 (sem feedback critico de fuel, texto HUD pode sobrepor barra). Build TypeScript nao foi executado por restricao de permissao de shell.

---

## Achados por area

### 1. Fuel Decay

**Status: CORRETO com ressalvas de design.**

Arquivo:linha: `GameScene.ts:400-410`

```
if (this.dir !== 'NONE') {
  this.fuelDecAccumMs += cappedDelta;
  while (this.fuelDecAccumMs >= FUEL_DECAY_INTERVAL_MS) { ... }
}
```

- O decay so ocorre quando `dir !== 'NONE'`. Quando o player encosta numa parede, `dir` vira `'NONE'` (linha 427) e o decay para. Isso e comportamento intencional, identico ao original NES. **Decisao de design razoavel: aceitar.**
- `cappedDelta = Math.min(delta, 50)` e aplicado corretamente (linha 396). Em lag spike de 200ms, o jogador efetivamente "ganha" tempo de fuel (perdeu 50ms de decaimento em vez de 200ms). Aceitavel para web game casual.
- Acumulador `fuelDecAccumMs` **nao e resetado em `init()`** quando ocorre game over e restart? Verificar: `init()` linha 138 faz `this.fuelDecAccumMs = 0;` — OK, ja e resetado. Sem vazamento de estado.
- Matematica: 1pt/500ms = 0.002pt/ms. 100pt duram 50s de movimento. **Sem NaN possivel** — `fuel` e sempre resultado de `Math.max(0, fuel - 1)` garantindo inteiro nao-negativo.

**Sem bug. Design adequado.**

---

### 2. Penalty de Tile

**Status: CORRETO.**

Arquivo:linha: `GameScene.ts:484-491` (onEnterTile) e `GameScene.ts:494-499` (applyFuelPenalty)

- FLORES: penalty -12, tile vira CUT (one-shot). Evita penalty repetido. Correto.
- STONE: penalty -25 + camera shake(250ms, 0.008). Tile permanece. Correto (modelo NES).
- Sequencia quando fuel ja e zero ao entrar em pedra:
  1. `applyFuelPenalty(25)` e chamado
  2. `fuel = Math.max(0, 0 - 25) = 0` — sem underflow
  3. `if (this.fuel <= 0) triggerGameOver()` — chamado
  4. `triggerGameOver()` tem guard `if (this.gameOver) return` — sem duplo trigger
  5. `update()` apos `onEnterTile` checa `if (this.gameOver || this.levelCleared) return` (linha 449) — correto
- Race galao + pedra: `onEnterTile` verifica galao primeiro (linha 476) e retorna cedo se pickup. Impossivel processar galao e pedra no mesmo tile. **OK.**

**Sem bug.**

---

### 3. Spawn do Galao

#### 3a. Bug P1 — Tween/sprite do galao NAO e destruido no SHUTDOWN

**Severidade: P1 (leak de recurso, pode causar erro de Phaser ao trocar de scene)**

Arquivo:linha: `GameScene.ts:253-259` (handler SHUTDOWN) e `GameScene.ts:589-594` (clearFuelBarrel)

O handler SHUTDOWN registrado em `events.once(Phaser.Scenes.Events.SHUTDOWN, ...)` (linha 253) apenas chama `this.fuelSpawnTimer?.remove()`. Ele **nao chama** `clearFuelBarrel()`.

Em cenarios onde o jogador aperta ESC durante o jogo (com um galao ativo na tela):
1. `onEscape` chama `this.scene.start('TitleScene')` (linha 245-247)
2. Phaser dispara SHUTDOWN da GameScene
3. O tween do galao ainda esta rodando — `tween.stop()` nunca e chamado
4. O sprite do galao pode ser destruido pelo Phaser automaticamente como parte do shutdown do DisplayList, mas o `Tween` referenciado em `this.fuelBarrel.tween` pode persistir no TweenManager se o plugin nao for limpo antes do objeto ser destruido

`triggerGameOver()` e `onLevelClear()` chamam `clearFuelBarrel()` corretamente, mas o path de ESC-para-titulo (linha 245-247) passa direto pelo `scene.start` sem trigger de game over ou level clear, entao `clearFuelBarrel` nunca e chamado.

**Reproducao**: ter galao ativo -> apertar ESC -> Phaser pode logar aviso de tween em objeto destruido.

**Correcao recomendada** em `create()` linha 258:
```typescript
this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.input.off('pointerdown', onPointerDown);
  kb.off('keydown-SPACE', onConfirm);
  kb.off('keydown-ENTER', onConfirm);
  kb.off('keydown-ESC', onEscape);
  this.fuelSpawnTimer?.remove();
  this.clearFuelBarrel(); // ADICIONAR ESTA LINHA
});
```

#### 3b. Galao em tile que sera cortado antes do pickup — sprite "flutuante"

**Severidade: P2 (visual glitch, nao e crash)**

Arquivo:linha: `GameScene.ts:539-576` (spawnFuelBarrel) e `GameScene.ts:502-509` (cutTileAt)

Sequencia do bug:
1. Barrel spawna em tile TALL (x=5, y=3) — snapshot do estado atual
2. Player se move para (x=5, y=3) no mesmo frame em que o timer dispara o spawn
3. Timing: o `delayedCall` e processado pela fila de tempo do Phaser antes do `update()` do mesmo frame — portanto `spawnFuelBarrel` pode executar **apos** o player ja ter saido do tile, ou mais critico, se o timer disparar enquanto o player AINDA esta chegando:
   - `spawnFuelBarrel` exclui o tile do player atual (`if (x === this.playerTileX && y === this.playerTileY) continue` linha 547), mas o player pode ter saido do tile entre o disparo do timer e o processamento
   - Apos spawn, o tile (x=5, y=3) ainda e TALL. Player volta a passar — `onEnterTile` verifica galao primeiro (linha 476) — pickup correto. **Este caso e OK.**

O caso realmente problematico: barrel spawna em tile TALL. Depois, o player CORTA esse tile por outro caminho (mas o jogo e de movimento continuo em linha reta — o player so pode entrar no tile do barrel por `onEnterTile`, que faz pickup. O player nao pode "cortar" o tile sem passar por ele. **Portanto nao ha caminho para cortar um tile que tem barrel sem fazer pickup primeiro.**

**Conclusao**: o sprite flutuante NAO pode ocorrer no modelo de movimento atual porque o tile TALL so vira CUT quando o player entra nele via `onEnterTile`, e `onEnterTile` faz pickup antes de verificar o tipo. O bug descrito no foco e inaplicavel. **Falso positivo.**

#### 3c. Reagendamento infinito quando candidates.length == 0

Arquivo:linha: `GameScene.ts:552-555`

Se todos os tiles TALL forem cortados mas `levelCleared` ainda nao foi triggerado (cenario impossivel por design — `onLevelClear` e chamado quando `cutCount >= grama_alta_para_cortar`, e nesse ponto `levelCleared=true` e `fuelSpawnTimer.remove()` e chamado), o reagendamento entraria em loop. Mas como `spawnFuelBarrel` checa `if (this.gameOver || this.levelCleared) return` no inicio (linha 540), o loop infinito nunca ocorre. **OK.**

---

### 4. Game Over Flow

**Status: CORRETO.**

Arquivo:linha: `GameScene.ts:621-647` (triggerGameOver) e `GameScene.ts:394-410` (update fuel check)

- Guard duplo: `if (this.gameOver) return` em `triggerGameOver()` (linha 622). Correto.
- Race `update()` vs `applyFuelPenalty()`: ambos podem chamar `triggerGameOver()` no mesmo frame, mas o guard previne dupla execucao. Correto.
- `advancing` flag previne double-fire em SPACE+touch simultaneo: `restartLevel()` e `advanceLevel()` checam `if (this.advancing) return` (linhas 660, 650). **Correto.**
- `restartLevel()` usa `scene.restart({ levelIndex: this.levelIndex })` — passa o indice correto para `init()`. Correto.
- Texto game over nao tem `setScrollFactor(0)` explicitamente — verificando: linha 644 chama `this.centerMessage.setScrollFactor(0)`. **OK.**

---

### 5. Cleanup

#### 5a. SHUTDOWN sem clearFuelBarrel — JA DOCUMENTADO em 3a (P1)

#### 5b. clearFuelBarrel em triggerGameOver e onLevelClear

Arquivo:linha: `GameScene.ts:626-627` e `GameScene.ts:600-601`

Ambos chamam `this.fuelSpawnTimer?.remove()` e `this.clearFuelBarrel()` corretamente. **OK.**

#### 5c. init() reseta todos os campos da G4

Arquivo:linha: `GameScene.ts:129-144`

Verificado: `fuel`, `fuelDecAccumMs`, `fuelBarrel`, `fuelSpawnTimer`, `gameOver`, `advancing` sao todos resetados. `vs` e recalculado. **OK — sem estado residual entre runs.**

---

### 6. HUD

**Status: FUNCIONAL com melhorias recomendadas.**

#### 6a. Sobreposicao do hudText com fuelBar — P2

Arquivo:linha: `GameScene.ts:278-287` e `GameScene.ts:289-292`

`hudText` comeca em x=40 com `setOrigin(0, 0.5)`. O texto "FASE 10/10  CORTADO 248/248 (100%)" em Arial Black 32px ocupa aproximadamente 580px de largura. A barra de fuel comeca em `fuelBarX = GAME_WIDTH - 40 - 320 = 920`. Gap entre fim do texto (~620px) e inicio da barra (~920px) e de ~300px. **OK para niveis 1-9.** No nivel 10 com texto maximo o gap permanece adequado.

Em modo olhos cansados (hudFont=44px): texto ocupa ~800px, gap com barra e ~120px — **apertado mas nao sobrepoe.** Monitorar.

#### 6b. Ausencia de feedback critico de fuel — P2

Quando fuel < 25% (laranja), a barra muda de cor mas **nao ha piscar, som ou animacao adicional**. Para o publico-alvo (40-70 anos), o feedback visual pode ser insuficiente. Sugestao: adicionar tween de piscar em `fuelBarFill` quando `ratio < 0.25`.

#### 6c. fuelLabel sobre a barra com cor variavel — P3

O label "COMBUSTIVEL X/100" em branco com stroke preto e legivel sobre todas as cores (verde, amarelo, laranja) da barra. **Sem problema.**

---

### 7. Balance de Combustivel

**Metodologia**: velocidade=240px/s, TILE_SIZE=64px → 3.75 tiles/s. Fuel=100pt, decay=1pt/500ms de movimento = 2pt/s de movimento. Logo 100pt duram **50s de movimento**. Por galao: restaura 100pt = mais 50s.

| Fase | grama_alta | tiles/s | tempo_min (s) | fuel_necessario (pt) | galoes_minimos | spawn_ms |
|------|-----------|---------|--------------|---------------------|----------------|----------|
| 1    | 96        | 3.75    | 25.6         | 51.2                | 1 (com margem) | 10000    |
| 2    | 116       | 3.75    | 30.9         | 61.8                | 2              | 9000     |
| 3    | 122       | 3.75    | 32.5         | 65.0                | 2              | 8000     |
| 4    | 183       | 3.75    | 48.8         | 97.6                | 2              | 7000     |
| 5    | 173       | 3.75    | 46.1         | 92.2                | 2              | 6500     |
| 6    | 247       | 3.75    | 65.9         | 131.7               | 3              | 6000     |
| 7    | 190       | 3.75    | 50.7         | 101.3               | 3              | 5500     |
| 8    | 221       | 3.75    | 58.9         | 117.9               | 3              | 5500     |
| 9    | 247       | 3.75    | 65.9         | 131.7               | 3              | 5500     |
| 10   | 248       | 3.75    | 66.1         | 132.3               | 3              | 5500     |

**Observacoes**:

- Fases 1-5: jogavel confortavelmente. Com rota otima, 1-2 galoes sao suficientes.
- Fases 6-10: exigem pelo menos 3 galoes. Com spawn de 5.5-6s, em 65s de jogo aparecem ~11 galoes potenciais. **Mais que suficiente**, mas depende do player pegar os galoes (que aparecem em tiles TALL aleatorios, potencialmente fora do caminho atual).
- **Problema de design P2**: fases 6-10 com muitas PEDRAS (penalty -25 cada) podem esgotar fuel rapidamente. Fase 9 tem 13 pedras na linha 5. Se player acertar 4 pedras = -100pt = game over imediato. O player pode evitar pedras, mas o galao spawna em TALL aleatorio — pode estar atras de uma zona de pedras.
- Fase 6: `grama_alta_para_cortar=247` mas a fase tem muitas PEDRAS e nenhuma FLORES. Contando TALL tiles na fase 6: 275 total - CUT(12) spawn area - STONE(~17) = ~246 TALL. `grama_alta_para_cortar=247 > 246 TALL reais` — **possivel bug P1: nivel 6 pode ser impossivel de completar** se nem todos os tiles TALL forem alcancaveis ou se o contador excede os tiles disponiveis!

**Verificacao do Nivel 6 TALL count** (contagem manual das rows):
- Row 0: 25 TALL (todos 1)
- Row 1: 22 TALL (3 STONEs em pos 4,14,22)
- Row 2: 22 TALL (3 STONEs em pos 1,8,17)
- Row 3: 23 TALL (2 STONEs em pos 6,20)
- Row 4: 21 TALL (1 STONE pos 23, 3 CUT pos 11-13)
- Row 5: 21 TALL (2 STONEs pos 2,18, 3 CUT pos 11-13)
- Row 6: 22 TALL (1 STONE pos 5, 3 CUT pos 11-13)
- Row 7: 22 TALL (2 STONEs pos 8,20)
- Row 8: 22 TALL (2 STONEs pos 1,16)
- Row 9: 22 TALL (3 STONEs pos 4,11,22)
- Row 10: 25 TALL (todos 1)

Total TALL = 25+22+22+23+21+21+22+22+22+22+25 = **247 TALL tiles**. `grama_alta_para_cortar=247`. **Match perfeito. Sem bug.**

**Porem**: se o player entrar em algum tile TALL via `cutTileAt`, ele incrementa `cutCount`. Como STONE nao e cortado, o player precisa cortar todos os 247 TALL. Se algum TALL estiver inacessivel por bloqueio de STONE (que nao e `canEnter`=false — STONE e passavel, apenas penaliza), todos sao alcancaveis. **OK.**

---

### 8. Regressoes de G3 (checklist do handoff)

- [x] Formato `niveis.json` nao alterado. LevelJson compativel.
- [x] Deep clone `JSON.parse(JSON.stringify(...))` ainda presente (linha 154).
- [x] Novos eventos de teclado: `5bcf397` adicionou cleanup explicito via SHUTDOWN — sem leak.
- [x] `worldOffsetX()` nao alterado.
- [x] `SceneData` sem novos campos. `init()` reseta todos os campos G4 corretamente.
- [x] Rectangles (sem sprites), area clicavel nao afetada.
- [x] Fallback `TitleScene` em caso de nivel nao encontrado ainda presente (linha 149-151).
- [x] `cutCount` overflow: `grama_alta_para_cortar` checa `>=`, sem problema para incremento de 1.
- [x] Camera bug P1 de G3 **CORRIGIDO** em `5bcf397`: `startFollow` sem offsetX erroneo.

---

## Build TypeScript

Nao foi possivel executar `npm run build` — permissao de shell negada (nao relacionado ao codigo). Analise estatica manual nao identificou erros de tipo evidentes:
- `FuelBarrel` interface corretamente tipada (sprite: Rectangle, tween: Tween)
- `getData('maxWidth') as number` e unsafe cast mas nao erro de compilacao
- `FUEL_SPAWN_MS[this.levelIndex] ?? 8000` — `levelIndex` pode ser 0-9, array tem indices 0-9. OK.
- `VisualScale` e `visualScaleFor` sem problemas de tipo aparentes

**PENDENTE**: executar `npm run build` para confirmar zero erros TypeScript.

---

## Tabela de bugs/achados

| ID   | Severidade | Descricao                                                                 | Arquivo:linha       | Status         |
|------|-----------|---------------------------------------------------------------------------|---------------------|----------------|
| G4-01 | P1        | SHUTDOWN nao chama `clearFuelBarrel()` — tween pode vazar ao trocar de cena via ESC | `GameScene.ts:253-259` | Aberto        |
| G4-02 | P2        | Sem feedback critico (piscar) quando fuel < 25%                           | `GameScene.ts:520-531` | Aberto (nice-to-have) |
| G4-03 | P2        | Balance: fases 6-10 com muitas pedras podem esgotar fuel antes do galao chegar | design          | Aberto (monitorar) |
| G4-04 | P3        | HUD em modo olhos cansados: gap texto/barra e ~120px — apertado           | `GameScene.ts:278-292` | Aberto (monitorar) |
| G4-05 | P3        | Build TypeScript nao validado por permissao de shell                      | `jogo/`             | Pendente       |

---

## Regressoes de G3 nao resolvidas (herdadas)

Ainda pendentes do handoff G3 pass-01:
- [ ] Teste de jitter camera em fases 1-3 (worldW < GAME_WIDTH) — nao testavel estaticamente
- [ ] Teste de leak de keyboard: corrigido em `5bcf397` via cleanup SHUTDOWN, mas nao testado em runtime
- [ ] Teste de camera em niveis 9-10: corrigido em `5bcf397` (offsetX removido), confirmar visualmente
- [ ] Validacao do `editor_x` vs `game_x` para spawn correto
- [ ] Teste em mobile real
