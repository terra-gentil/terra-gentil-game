# QA Report — Sprint G2 (Engine Core)

| Campo        | Valor                                  |
|--------------|----------------------------------------|
| Sprint       | G2 — Engine Core                      |
| Commit       | c1a9b6a                                |
| Data         | 2026-04-30                             |
| Reviewer     | Sub-agente Sonnet G2 pass-01           |

---

## Cobertura

| Area                            | Status        |
|---------------------------------|---------------|
| Algoritmo snap-to-grid          | Revisado      |
| Direction change / pendingDir   | Revisado      |
| canEnter / bounds               | Revisado      |
| Estado da fase / cache          | Revisado      |
| HUD / pct / COMPLETA            | Revisado      |
| TypeScript strict / null safety | Revisado      |
| Memoria / event listeners       | Revisado      |
| Mobile / touch coords           | Revisado      |
| Compilacao real (tsc --noEmit)  | NAO EXECUTADA (permissao negada pelo sandbox) |

---

## Achados

### P1 — Cache JSON mutado: reinicio corrompe fase

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:221`

**Trecho:**
```ts
private cutTileAt(tx: number, ty: number): void {
  this.level.tiles[ty][tx] = TILE.CUT;   // linha 221 — muta o objeto in-place
```

**Descricao:** `this.level` e uma referencia direta ao objeto retornado por `this.cache.json.get('fase_01')`. Phaser armazena o objeto JSON parseado no cache sem clonar. Mutacoes em `this.level.tiles[ty][tx]` propagam diretamente para o cache global. Se o jogador voltar ao `TitleScene` e reiniciar `GameScene`, `create()` faz `this.cache.json.get('fase_01')` novamente e recebe o mesmo objeto ja parcialmente cortado — a fase comeca pre-danificada.

**Reproducao:** Jogar ate cortar alguns tiles, voltar ao menu, iniciar nova partida.

**Recomendacao:** Em `create()`, substituir:
```ts
this.level = this.cache.json.get('fase_01') as LevelJson;
```
por uma deep-clone:
```ts
this.level = JSON.parse(JSON.stringify(this.cache.json.get('fase_01'))) as LevelJson;
```
G3 ja corrigiu isso com deep clone — confirmar na revisao da G3.

---

### P1 — STONE e FLOWERS nao bloqueiam movimento: player atravessa obstaculos

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:206–210`

**Trecho:**
```ts
private canEnter(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0) return false;
  if (tx >= this.level.largura_efetiva_tiles) return false;
  if (ty >= this.level.altura_tiles) return false;
  return true;   // qualquer tile interno e considerado navegavel
}
```

**Descricao:** `canEnter` verifica apenas bounds de grade, nao o tipo do tile. O tile `STONE (3)` deve ser intransponivel segundo a mecanica do jogo original (Lawn Mower NES). Tambem, `FLOWERS (2)` pode ou nao ser navegavel conforme design — mas essa decisao nao esta codificada. Na `fase_01.json` inspecionada, o layout nao contem STONE nem FLOWERS (apenas CUT e TALL), entao o bug nao se manifesta na fase 1, mas qualquer fase futura com `STONE` fara o player atravessar pedra.

**Recomendacao:** Adicionar checagem de tipo:
```ts
const type = this.level.tiles[ty][tx];
if (type === TILE.STONE) return false;
```

---

### P1 — Lag spike / grande delta pode pular o tile-center e acionar `reached` com `oldPx` ja ALEM do target

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:177–180`

**Trecho:**
```ts
const reached =
  (v.x !== 0 && Math.sign(targetCx - oldPx) !== Math.sign(targetCx - newPx)) ||
  (v.y !== 0 && Math.sign(targetCy - oldPy) !== Math.sign(targetCy - newPy)) ||
  (this.player.x === targetCx && this.player.y === targetCy);
```

**Descricao:** O algoritmo detecta cruzamento de centro pelo sinal. Em um frame normal funciona. O problema ocorre se `dt` for muito grande (lag spike, ou aba em background): `newPx` pode ultrapassar NAO SÓ `targetCx`, mas tambem o centro do tile SEGUINTE. Nesse caso `reached` detecta o primeiro tile corretamente (sinal muda) e snapa para `targetCx` — OK. Mas em lag spikes extremos onde `delta` e multiplos de `TILE_SIZE / speed` o overshoot e recuperado na linha 183:
```ts
this.player.x = targetCx;   // snap correto
```
O snap existe e corrige a posicao, entao o overshoot VISUAL e mitigado. Porem `playerTileX` avanca apenas 1 tile por frame — um lag spike de p.ex. 5 tiles/frame resultara em movimento "teleporte" percebido de 1 tile e acumulo de defasagem nas proximas chamadas.

**Recomendacao:** Limitar `dt` (ex: `const dt = Math.min(delta / 1000, 0.05)`) para evitar que qualquer lag spike mova o player mais do que um tile.

---

### P2 — Reverse 180° enfilera `pendingDir` mas pode ser aplicado no tile ERRADO

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:137–143` e `189–195`

**Trecho:**
```ts
private requestDir(d: Dir): void {
  if (d === this.dir) return;
  this.pendingDir = d;
  if (this.dir === 'NONE') {
    this.dir = d;
    this.pendingDir = 'NONE';
  }
}
```

**Descricao:** Quando o player esta em movimento (p.ex. `dir = RIGHT`) e pressiona `LEFT` (reverso 180°), `pendingDir = 'LEFT'` e armazenado. O reverse so e aplicado no proximo `reached` (centro do tile seguinte). Isso e consistente com o estilo NES, mas o player continua indo para a direita ate chegar ao proximo tile — podendo entrar em um tile de STONE ou borda antes de poder reverter. Adicionalmente: se o player bate na borda enquanto tem `pendingDir = LEFT` (reverse), `dir` e setado para `NONE` na linha 167 e `pendingDir` NUNCA e limpo. No proximo toque/tecla o `requestDir` vai testar `d === this.dir` onde `this.dir = 'NONE'`, entrar no branch e setar `this.dir = d` ignorando o `pendingDir` pendente — de fato e limpo pois `pendingDir = 'NONE'` na linha 142. Entao nao ha stale state, mas a UX de "pressionar reverso enquanto indo para borda" e imperceptivel para o jogador (nada acontece).

**Recomendacao:** Ao atingir borda com `pendingDir != NONE`, tentar aplicar o `pendingDir` antes de setar `dir = NONE`, permitindo reverter na borda.

---

### P2 — `pendingDir` nao e resetado quando a direcao perpendicular nao pode entrar

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:189–195`

**Trecho:**
```ts
if (this.pendingDir !== 'NONE' && this.pendingDir !== this.dir) {
  const pv = DIR_VEC[this.pendingDir];
  if (this.canEnter(this.playerTileX + pv.x, this.playerTileY + pv.y)) {
    this.dir = this.pendingDir;
  }
  this.pendingDir = 'NONE';   // sempre limpa, mesmo que nao possa entrar
}
```

**Descricao:** `pendingDir = 'NONE'` e executado incondicionalmente na linha 194, mesmo quando `canEnter` retornou `false`. Isso significa que se o player pedir virar mas o tile adjacente na nova direcao estiver bloqueado, o pedido e descartado silenciosamente em vez de ser re-tentado no proximo tile. Em jogos NES-like esse e frequentemente o comportamento esperado (inputs so valem no proximo tile), mas deve ser documentado.

**Nota:** Com `canEnter` nao verificando STONE, isso raramente aparece na G2. Quando STONE for adicionado, o comportamento de re-tentativa sera relevante.

---

### P2 — Sinal zero em `Math.sign` quando player esta exatamente no centro

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:178–179`

**Trecho:**
```ts
Math.sign(targetCx - oldPx) !== Math.sign(targetCx - newPx)
```

**Descricao:** `Math.sign(0) === 0`. Se o player esta EXATAMENTE no centro de um tile (`oldPx === targetCx`), entao `Math.sign(targetCx - oldPx) = Math.sign(0) = 0`. A expressao torna-se `0 !== Math.sign(targetCx - newPx)`. Se `newPx > targetCx` (player avanca), `Math.sign` retorna `1` e `0 !== 1` e `true` — `reached` e acionado corretamente. Mas na linha 180 tem o fallback `this.player.x === targetCx` que tambem cobriria o caso. Portanto este edge case nao causa bug, mas a dependencia em dois mecanismos sobrepostos pode confundir manutencao.

---

### P2 — HUD `pct` pode exceder 100% se `cutCount > grama_alta_para_cortar`

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:232`

**Trecho:**
```ts
const pct = Math.round((this.cutCount / target) * 100);
```

**Descricao:** `cutCount` comeca em 0 e incrementa 1 por tile. `grama_alta_para_cortar = 96` e ha exatamente 96 tiles TALL na `fase_01.json` (contagem confirma 96 ocorrencias de valor `1`). Portanto `cutCount` nunca excede `target` na fase 1. Porem se uma fase futura tiver discrepancia (ex: `grama_alta_para_cortar` menor que o numero real de tiles TALL), `pct` exibiria `> 100`. Nao ha `Math.min(pct, 100)`.

**Recomendacao:** Adicionar clamp: `const pct = Math.min(Math.round((this.cutCount / target) * 100), 100);`

---

### P2 — Jogo continua apos "FASE COMPLETA": player pode mover e cortar tiles

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:225–227`

**Trecho:**
```ts
if (this.cutCount >= this.level.grama_alta_para_cortar) {
  this.hudText.setText(`FASE ${this.level.id} COMPLETA!`);
}
```

**Descricao:** Ao completar a fase, apenas o texto do HUD muda. Nao ha flag `levelCleared`, nao ha pausa, nao ha bloqueio de input. O loop `update()` continua rodando; `readInput()` aceita teclas; o player continua se movendo. Nenhum novo tile pode ser cortado (todos ja sao CUT), mas o player pode continuar se movendo indefinidamente. `cutCount` incrementaria apenas se restassem tiles TALL, portanto sem risco de overflow duplo — mas a ausencia de transicao de cena e ruim para UX.

---

### P2 — `canEnter` nao bloqueia STONE

**(Duplicado como P1 acima — o finding principal esta la. Este e o risco residual de UX):** O player atravessa `STONE` silenciosamente; o tile nao muda de cor mas `onEnterTile` nao o corta (so corta TALL). O jogador ve o player pisando em pedra sem feedback. Na fase 1 nao ocorre pois nao ha STONE.

---

### P2 — Touch `pointerdown` usa `pointer.worldX` mas camera em G2 nao tem scroll

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:101–108`

**Trecho:**
```ts
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  const dx = pointer.worldX - this.player.x;
  const dy = pointer.worldY - this.player.y;
```

**Descricao:** Em G2 a camera e estatica (sem scroll), portanto `worldX == screenX`. O calculo esta correto para G2. G3 introduziu camera scroll — neste ponto a logica deve ser revisada pois `pointer.worldX` depende do scroll da camera. `this.player.x` e a posicao no espaco WORLD, e `pointer.worldX` tambem e world (Phaser converte automaticamente). Portanto a subtracao `worldX - player.x` e semanticamente correta mesmo com scroll. Este risco nao se materializa, mas deve ser documentado para o QA da G3 confirmar que o comportamento com camera movel ainda funciona.

---

### P3 — `this.input.keyboard!` non-null assertion sem guarda

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:99`

**Trecho:**
```ts
this.cursors = this.input.keyboard!.createCursorKeys();
```

**Descricao:** Em Phaser 3, `this.input.keyboard` pode ser `null` se o jogo for configurado com `input.keyboard: false`. A config em `GameConfig.ts` nao desativa o teclado, portanto em runtime nao e `null`. O `!` suprime o erro TypeScript sem runtime guard. Nao causa bug na config atual, mas e fragil.

**Recomendacao:** Verificar antes de usar:
```ts
if (!this.input.keyboard) throw new Error('Keyboard input nao disponivel');
this.cursors = this.input.keyboard.createCursorKeys();
```

---

### P3 — `cache.json.get` retornado como `unknown` e castado sem validacao

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:44`

**Trecho:**
```ts
this.level = this.cache.json.get('fase_01') as LevelJson;
```

**Descricao:** `cache.json.get` retorna `unknown` (Phaser tipagem). O cast `as LevelJson` e um type assertion sem validacao em runtime. Se o JSON estiver malformado, campos ausentes ou tiver chave errada, o erro surge apenas quando o campo e acessado (ex: `this.level.largura_efetiva_tiles`), nao no ponto da cast. O `if (!this.level)` na linha 45 verifica apenas se o JSON foi carregado, nao se a estrutura e valida.

**Risco:** Baixo em desenvolvimento controlado; alto se o JSON for editado manualmente. Nao bloqueia G2.

---

### P3 — `noUnusedParameters` e `noUnusedLocals` ativo mas `_time` em `update`

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:148`

**Trecho:**
```ts
update(_time: number, delta: number): void {
```

**Descricao:** O underscore prefix `_time` e convencao aceita pelo TypeScript para parametro intencionalmente ignorado. Com `noUnusedParameters: true` no `tsconfig.json`, isso e valido pois o `_` indica intencionalidade. OK — nao e bug.

---

### P3 — Nenhum listener de `pointerdown` e removido no shutdown

**Arquivo:linha:** `jogo/src/scenes/GameScene.ts:101`

**Trecho:**
```ts
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => { ... });
```

**Descricao:** Em Phaser 3, ao fazer `scene.start('OutraScene')`, a cena atual e destruida (`shutdown` + `destroy`). O sistema de input de Phaser normalmente limpa os listeners de `this.input` junto com a cena. Portanto nao ha leak real em Phaser 3 — o EventEmitter da cena e coletado junto com ela. Porem, se a cena for `sleep()`-ed em vez de destruida (G3 ou G4 podem fazer isso), o listener permanece ativo. Nao ha `shutdown()` ou `destroy()` override para remocao explicita.

**Recomendacao:** Para robustez futura: `this.input.off('pointerdown')` em `shutdown()`.

---

## Riscos Nao Tratados

- **Compilacao TypeScript (tsc --noEmit)** nao foi executada nesta revisao por restricao de permissao do sandbox. A corretude de tipos foi avaliada por leitura estatica do codigo.
- **Browser real / mobile fisico** nao testado — sem como verificar comportamento de touch com multiplos pontos simultaneos.
- **Performance em levels grandes** nao medida — a grade em G2 (14x11 = 154 tiles) e pequena; o loop de `update()` e O(1) por frame pois nao itera a grade, apenas acessa `tileGrid[ty][tx]` por indice direto. Nao ha filtro em `children.list` em G2 (contrariamente ao mencionado no brief — nao existe `markTileCut` filtrando `children.list` em c1a9b6a).

---

## O que esta Bom

- **Snap-to-grid funciona corretamente** para o caso comum: a combinacao de deteccao por troca de sinal + fallback por igualdade exata e robusta para frames normais (16ms–33ms).
- **Bounds `canEnter` cobre todos os 4 lados** (`tx < 0`, `ty < 0`, `tx >= W`, `ty >= H`) — correto.
- **`cutCount` vs `grama_alta_para_cortar`** esta aritmeticamente certo para `fase_01.json` (96 tiles TALL == 96 alvo).
- **HUD e renderizado em depth 1000** acima de tudo, sem risco de ser ocultado por tiles.
- **Spawn** no tile `[5][6]` (editor_x=6, editor_y=5) que e tile CUT (valor 0) — o player nao corta tiles ao aparecer... Exceto que `create()` verifica se o spawn e TALL e corta se for. Como o spawn e CUT, nada e cortado. Correto.
- **Centralizacao do mundo** em `originX/Y` usa `Math.round` evitando sub-pixel em tiles.
- **`pixelArt: true` + `roundPixels: true`** na config — boa escolha para um port NES.
- **`DIR_VEC` imutavel** com `as const` implicitly — limpo.
- **`TILE_COLOR` cobre 4 tipos** com fallback `?? 0x222222` — defensivo.

---

## Recomendacoes para Sprints Futuras

1. **G3 (confirmado)**: Deep clone do JSON na `create()` — validar que isso foi implementado e funciona com multiplas fases.
2. **Qualquer sprint com STONE**: Adicionar `TILE.STONE` a `canEnter` como tile solido. Sem isso fases com obstaculos sao injogaveis.
3. **Apos completar fase**: Implementar `levelCleared` flag para bloquear input e acionar transicao automatica (delay + cena de resultado).
4. **dt cap**: Adicionar `const dt = Math.min(delta / 1000, 0.05)` no inicio de `update()` para proteger contra lag spikes.
5. **Validacao de runtime do LevelJson**: Considerar funcao `parseLevelJson(raw: unknown): LevelJson` com checks de `typeof` para campos criticos antes de usar o JSON.
6. **Reverse 180 na borda**: Quando `canEnter` falha com `pendingDir` ativo, tentar aplicar o `pendingDir` antes de anular o movimento.
7. **Touch multi-ponto**: Com `activePointers: 3` na config, verificar que apenas o primeiro toque direciona (nao soma dois toques).
