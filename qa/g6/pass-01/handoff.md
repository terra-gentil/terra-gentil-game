# Handoff G6 pass-01

---

## Para reverificacao desta sprint (G6 pass-02+)

### O que ja foi validado (analise estatica)

- [x] `SfxPlayer.ts`: AudioContext lazy — criado na primeira chamada a `playTone()`, nunca em modulo-load
- [x] `ensureContext()`: fallback `webkitAudioContext` via cast correto, try/catch que retorna `undefined` em falha
- [x] `ensureContext()`: checa `ctx.state === 'suspended'` e chama `ctx.resume()` — sem await (ver P2-01)
- [x] `playTone()`: checa `this.muted` antes de criar qualquer node — sem audio em modo mudo
- [x] Envelope ataque-decay: `setValueAtTime(0, start)` + `linearRampToValueAtTime(volume, start+0.005)` + `exponentialRampToValueAtTime(0.001, start+dur)` — correto, sem clique de DC
- [x] `osc.stop(start + dur)`: agenda stop no scheduler — correto
- [x] Falta `osc.disconnect()` / `gain.disconnect()` — P1-01 aberto
- [x] Singleton `sfx` exportado — uma instancia compartilhada entre TitleScene e GameScene
- [x] `Settings.soundEnabled`: default `true`, incluido em `DEFAULT_SETTINGS` com spread correto
- [x] `toggleSound()`: le + salva + retorna novo estado — simetrico com `toggleEyeStrainMode()`
- [x] `GameScene.init()`: `sfx.setMuted(!settings.soundEnabled)` — sincroniza ao entrar/reiniciar fase
- [x] `TitleScene.create()`: `sfx.setMuted(!getSettings().soundEnabled)` — sincroniza ao voltar ao titulo
- [x] Sequencia toggle SOM: `toggleSound()` → `sfx.setMuted(!updated.soundEnabled)` → `sfx.fuelPickup()` se ligando — ordem correta (unmute antes de tocar)
- [x] 6 pontos de disparo SFX no GameScene: cut, penaltyFlowers, penaltyStone, fuelPickup, levelClear, gameOver — todos cobertos
- [x] `centerMessage.setDepth(2002)` — P1-01 do G5 resolvido neste commit
- [x] Listeners globais do GameScene: SfxPlayer nao adiciona listeners, nao interfere com `currentlyOver`
- [x] Toggle SOM na TitleScene: nao aparece no GameScene, sem conflito com advancing flag

### Gaps (pendente para pass-02+)

- [ ] **Build TypeScript nao executado** — permissao de shell negada. Verificar que `SfxPlayer.ts` compila sem erros e que o import em `GameScene.ts` e `TitleScene.ts` resolve corretamente.
- [ ] **Teste em iOS Safari real** — validar P1-01 (accumulo de nodes) em sessao de 5+ minutos. Abrir Web Inspector → Memory → ver Audio Nodes criados.
- [ ] **Teste de primeiro SFX apos tap em JOGAR** — em iPhone Safari, confirmar se `sfx.cut()` no primeiro tile toca normalmente ou e silenciado (P1-02).
- [ ] **Teste de toggle SOM durante GameScene** — tap em SOM no Title → entra no jogo → confirma silencio. Tap em SOM no Title (liga) → entra no jogo → confirma audio.
- [ ] **Teste de mute + oscilador em curso** — se `sfx.penaltyStone()` (220ms) for tocado e `setMuted(true)` for chamado durante o SFX, confirmar que o SFX em curso termina normalmente (comportamento esperado — sem corte abrupto).
- [ ] **Teste de sawtooth 110Hz em tablet** — validar que `sfx.gameOver()` soa adequado em caixa de som de tablet (sem distorcao).

---

## Para QA das proximas sprints (G7+)

### Invariantes estabelecidos pela G6 que nao podem ser quebrados

#### SfxPlayer (`jogo/src/audio/SfxPlayer.ts`)

- O singleton `sfx` e a **unica instancia** de `SfxPlayer` no jogo. G7+ DEVE importar `{ sfx }` de `'../audio/SfxPlayer'` — nunca criar `new SfxPlayer()`.
- `sfx.setMuted(boolean)` e a interface de controle de mute. G7+ NUNCA deve acessar `sfx.muted` diretamente (campo privado). Usar `sfx.isMuted()` para leitura.
- A API publica de disparo de SFX segue o padrao **sem retorno, sem await**: `sfx.cut()`, `sfx.penaltyFlowers()`, `sfx.penaltyStone()`, `sfx.fuelPickup()`, `sfx.levelClear()`, `sfx.gameOver()`. Todos void e sincrono na interface (a execucao do audio e async no scheduler).
- Se G7+ adicionar novos SFX, DEVE adicionar metodos ao `SfxPlayer` (nao chamar `playTone` diretamente de fora da classe — e `private`).
- Se G7+ substituir os SFX sintetizados por OGG via Phaser (`this.sound.play(key)`), DEVE manter a interface publica `sfx.*` para minimizar mudancas no GameScene. A migracao recomendada e: manter `SfxPlayer` como facade e implementar os metodos com `this.scene.sound.play()` internamente.
- `ensureContext()` DEVE permanecer `private`. O AudioContext interno NUNCA deve ser exposto.

#### Contrato AudioContext (Web Audio API)

- O AudioContext DEVE ser criado lazy (na primeira chamada de `playTone()`), nunca no constructor, nunca em modulo-load. Isso e necessario para respeitar a politica de autoplay dos browsers.
- Se G7+ precisar criar o AudioContext antecipadamente (ex: pre-carregar buffers OGG), DEVE fazer isso apenas dentro de um handler de evento de usuario (pointerdown, keydown, click).
- Se G7+ migrar para `AudioBuffer`/`AudioBufferSourceNode`, o mesmo padrao de `osc.connect(gain).connect(ctx.destination)` DEVE ser mantido ou equivalente. **DEVE adicionar `source.addEventListener('ended', () => { source.disconnect(); gain.disconnect(); })`** para evitar o vazamento de nos identificado em P1-01.
- `ctx.resume()` DEVE ser chamado se `ctx.state === 'suspended'`, especialmente em mobile. Se a migracao para async for feita, adicionar `await ctx.resume()` antes de criar novos nodes.
- O fallback `webkitAudioContext` DEVE ser mantido para compatibilidade com Safari antigo (iOS <= 13). O cast `(window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext` e o padrao TypeScript correto.

#### Settings module (`jogo/src/config/Settings.ts`)

- `soundEnabled: boolean` DEVE permanecer no `Settings` interface com default `true`.
- `DEFAULT_SETTINGS.soundEnabled = true` — default deve ser LIGADO (audio ativo por default).
- `toggleSound()` DEVE ler + flip + salvar + retornar o novo estado em uma unica chamada atomica.
- Se G7+ adicionar novos campos ao `Settings`, DEVE incluir default em `DEFAULT_SETTINGS`.

#### Sincronizacao de mute

- `sfx.setMuted(!settings.soundEnabled)` DEVE ser chamado em `GameScene.init()` — nao apenas em `create()`. Isso garante que volta do Title sincroniza corretamente.
- `sfx.setMuted(!getSettings().soundEnabled)` DEVE ser chamado em `TitleScene.create()` — sincroniza apos reload de pagina.
- Se G7+ adicionar audio de fundo (musica), o mesmo `this.muted` flag DEVE controlar musica e SFX (ou adicionar flags separados, mas manter contrato com `Settings.soundEnabled`).

#### Pontos de disparo de SFX no GameScene

Os seguintes eventos DEVEM continuar disparando o SFX correspondente:

| Evento | Metodo | Arquivo:linha aproximada |
|---|---|---|
| Entrar em tile TALL | `sfx.cut()` | `GameScene.ts:onEnterTile` |
| Entrar em tile FLOWERS | `sfx.penaltyFlowers()` | `GameScene.ts:onEnterTile` |
| Entrar em tile STONE | `sfx.penaltyStone()` | `GameScene.ts:onEnterTile` |
| Coletar galao de combustivel | `sfx.fuelPickup()` | `GameScene.ts:onPickupFuel` |
| Completar fase | `sfx.levelClear()` | `GameScene.ts:onLevelClear` |
| Game over (combustivel zerado) | `sfx.gameOver()` | `GameScene.ts:triggerGameOver` |

Se G7+ adicionar novos eventos de jogo (ex: power-up, boss, ranking), DEVE adicionar o SFX correspondente em `SfxPlayer` e chamar nos pontos corretos do GameScene.

**INVARIANTE CRITICO**: `sfx.*` NUNCA deve ser chamado dentro de `update()` diretamente — apenas dentro de handlers de eventos discretos (`onEnterTile`, `onPickupFuel`, `onLevelClear`, `triggerGameOver`). Chamar SFX em `update()` a 60fps causaria `cut()` 60x/s = sobrecarga do grafo de audio.

---

### Sinais de regressao a monitorar em G7+

1. **Se G7 adicionar musica de fundo** (AudioBufferSourceNode em loop): verificar que `sfx.setMuted()` tambem silencia a musica, ou adicionar controle separado coordenado com `Settings.soundEnabled`.
2. **Se G7 migrar de SFX sintetizados para OGG**: manter a interface `sfx.*` como facade. Os metodos publicos (cut, penaltyFlowers, etc.) nao devem mudar de assinatura.
3. **Se G7 adicionar novos tiles ou mecanicas**: cada novo tile/evento com feedback de audio DEVE ter um SFX correspondente em `SfxPlayer`.
4. **Se G7 adicionar HUD buttons** (ex: pause, volume slider): verificar que os buttons sao interativos em Phaser e aparecem em `currentlyOver`, evitando conflito com o handler global `onPointerDown`.
5. **Se G7 alterar a estrutura de scenes** (ex: adicionar PauseScene): garantir que `sfx.setMuted()` e chamado em cada scene que pode ser a scene "de entrada" apos retorno do usuario.
6. **Se o bundle ultraspassar 400KB gzip**: revisar se OGG assets estao sendo incluidos corretamente (nao duplicados). SfxPlayer sintetico atual adiciona ~1KB ao bundle.

### Estado de bugs abertos desta sprint

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P1-01 | G6 | P1 | ABERTO — OscillatorNode sem disconnect() em Safari iOS |
| P1-02 | G6 | P1 | ABERTO — primeiro SFX no GameScene pode falhar em mobile Safari |
| P2-01 | G6 | P2 | ABERTO — resume() sem await pode silenciar SFX curtos |
| P2-02 | G6 | P2 | ABERTO — toggles menores: descobribilidade reduzida |

### Bugs herdados de sprints anteriores ainda abertos

| ID | Sprint | Severidade | Status |
|---|---|---|---|
| P1-03 | G5 | P1 | ABERTO — DOWN button eye-strain: 5px de margem inferior |
| P2-02 | G5 | P2 | ABERTO — toggle olhos cansados sem aviso de timing |
| P2-03 | G5 | P2 | ABERTO — barra de combustivel nao escala em eye-strain |
| P2-04 | G5 | P2 | ABERTO — D-pad sobrepoe tiles em niveis estreitos |
