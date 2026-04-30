# QA G3 - Relatorio pass-01

**Sprint**: G3 — Camera scroll + 10 fases  
**Data**: 2026-04-30  
**Reviewer**: Sub-agente Sonnet G3 pass-01  
**Commit**: caa959c  
**Build validado**: nao (permissao de shell negada no ambiente; analise estatica manual)

---

## Cobertura

| Area | Cobertura |
|---|---|
| Camera bounds e startFollow | Leitura completa + calculo manual |
| State cleanup entre niveis (init/create/destroy) | Leitura completa |
| Race condition em advanceLevel | Leitura completa |
| Deep clone JSON | Leitura + estimativa de custo |
| TitleScene level selector (HID/touch) | Leitura + calculo de area clicavel |
| canEnter / fronteiras | Leitura completa |
| HUD scrollFactor | Leitura completa |
| niveis.json dimensoes e spawns | Leitura via Grep (10 niveis verificados) |
| TypeScript build | NAO validado (shell negado) |

---

## Achados

### P1 — Camera offset fixo causa player descentrado em fases largas

**Arquivo**: `jogo/src/scenes/GameScene.ts:131`

```ts
this.cameras.main.startFollow(this.player, false, 0.1, 0, -GAME_WIDTH / 2 + this.player.x, 0);
```

**Problema**: O quinto argumento de `startFollow` e o `offsetX` — um deslocamento constante somado ao `target.x` a cada frame para determinar o ponto-alvo da camera. O valor `-GAME_WIDTH/2 + this.player.x` e calculado UMA VEZ no `create()` usando a posicao inicial do player.

Em fases largas (ex: nivel 9, W=30 tiles, worldOffsetX=0, spawn=(14,5) => player.x inicial = 14*64+32 = 928):

```
offsetX = -640 + 928 = +288
camera_scrollX = player.x + offsetX - GAME_WIDTH/2
              = player.x + 288 - 640
              = player.x - 352
```

O player aparece sempre a **352 px da borda esquerda** (nao centralizado em 640). Em fases menores o efeito e mascarado pelo clamping nos bounds.

**Comportamento esperado**: camera centraliza o player horizontalmente (player em x=640 na tela quando dentro dos bounds). Isso e o default de `startFollow` sem offsetX.

**Recomendacao**: Remover o quinto argumento. O `startFollow` sem offset ja centraliza o target:

```ts
this.cameras.main.startFollow(this.player, false, 0.1, 0);
```

Se quiser manter player levemente deslocado pra esquerda (mostrar mais do que vem pela frente), usar um offset fixo em px, ex: `-64`.

---

### P1 — Evento `keydown-SPACE/ENTER/ESC` acumula a cada run do nivel (keyboard event leak)

**Arquivo**: `jogo/src/scenes/GameScene.ts:133-139`

```ts
this.input.keyboard!.on('keydown-SPACE', () => {
  if (this.levelCleared) this.advanceLevel();
});
this.input.keyboard!.on('keydown-ENTER', () => {
  if (this.levelCleared) this.advanceLevel();
});
this.input.keyboard!.on('keydown-ESC', () => this.scene.start('TitleScene'));
```

**Problema**: `this.input.keyboard!.on(...)` adiciona listeners no sistema de input da Phaser. Quando o scene e reiniciado via `this.scene.start('GameScene', ...)`, a Phaser chama `shutdown()` e em seguida `create()`. O `shutdown` da Phaser remove listeners registrados via `this.events.on()` e `this.input.on()`, mas **nao remove** listeners em `this.input.keyboard` registrados com `.on()` diretamente — esses sobrevivem se o plugin de teclado for reutilizado.

Em um run de 10 fases (fade 1->2->3->...->10->title), `advanceLevel()` seria chamado por ate 10 handlers para SPACE na ultima vez que o player pressionar SPACE. Como `advanceLevel()` chama `this.scene.start()` varias vezes em sequencia, as chamadas subsequentes sao no-ops (a primeira `scene.start` ja muda o estado), mas o comportamento e impredizivel e pode causar transicoes duplicadas ou flash de scene.

**Para reproduzir**: jogar fases 1-10 em sequencia, apertar SPACE ao completar cada uma. Monitorar console para `scene.start` chamadas multiplas.

**Recomendacao**: Usar `this.input.keyboard!.once(...)` em vez de `.on(...)` para os handlers de avanco de nivel. Para ESC, usar `once` ou remover no shutdown:

```ts
// Alternativa 1: once (auto-remove apos primeiro disparo)
this.input.keyboard!.once('keydown-SPACE', () => { ... });

// Alternativa 2: remover via events.on shutdown
this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
  this.input.keyboard!.off('keydown-SPACE');
  this.input.keyboard!.off('keydown-ENTER');
  this.input.keyboard!.off('keydown-ESC');
});
```

---

### P1 — Race condition potencial em `advanceLevel()` via double-tap/SPACE+touch simultaneos

**Arquivo**: `jogo/src/scenes/GameScene.ts:186-192` (advanceLevel) + `108-119` (pointerdown) + `121-123` (keydown-SPACE)

```ts
// pointerdown handler:
if (this.levelCleared) {
  this.advanceLevel();
  return;
}

// keydown-SPACE handler:
if (this.levelCleared) this.advanceLevel();

// advanceLevel:
private advanceLevel(): void {
  if (this.levelIndex >= this.allLevels.length - 1) {
    this.scene.start('TitleScene');
  } else {
    this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 });
  }
}
```

**Problema**: `advanceLevel()` nao tem guard de "ja avanando". Se o player apertar SPACE e tocar a tela no mesmo frame (ou em frames consecutivos antes da transicao efetivar), `advanceLevel()` e chamado duas vezes. Cada chamada emite `scene.start()`. A Phaser enfileira ou sobrescreve — comportamento depende da versao e estado interno. Nao ha crash garantido, mas e um P1 de estabilidade.

**Recomendacao**: Adicionar flag de guard:

```ts
private advancing = false;

private advanceLevel(): void {
  if (this.advancing) return;
  this.advancing = true;
  // ...
}
```

Resetar `advancing = false` em `init()`.

---

### P2 — Camera tremor (jitter) em fases pequenas com `startFollow` + lerp

**Arquivo**: `jogo/src/scenes/GameScene.ts:131`

**Problema**: Nas fases 1-3 (14 tiles = 896 px < GAME_WIDTH 1280), o mundo e centralizado horizontalmente com `worldOffsetX = (1280-896)/2 = 192`. O player existe em pixel space, ex: x=608. Os bounds sao `setBounds(0, 0, max(896,1280), 720)` = `(0, 0, 1280, 720)`. A camera tenta seguir o player com lerp 0.1, mas o player nunca sai de um range que mantenha a camera fora dos bounds (todos os tiles ficam entre x=192 e x=1088). O resultado e: a camera fica tentando se mover em fracao de pixel a cada frame enquanto o player se move, mas os bounds clampam qualquer scroll. Com `roundPixels: true` no config, isso pode se manifestar como micro-jitter de 1px.

**Impacto**: Visual desconfortavel em fases pequenas. Potencialmente piora com `pixelArt: true`.

**Recomendacao**: Para fases onde `worldW < GAME_WIDTH`, desativar o follow e usar camera fixa:

```ts
if (this.worldW < GAME_WIDTH) {
  // Camera fixa — nivel cabe inteiro na tela
  this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
} else {
  this.cameras.main.startFollow(this.player, false, 0.1, 0);
}
```

---

### P2 — Botoes do seletor de fase potencialmente abaixo do minimo de touch

**Arquivo**: `jogo/src/scenes/TitleScene.ts:57-67`

```ts
const btn = this.add.text(startX + i * 80 + 40, GAME_HEIGHT - 140, String(i + 1), {
  fontFamily: 'Arial Black',
  fontSize: '32px',
  color: '#FFFFFF',
  backgroundColor: '#1B5E20',
  padding: { x: 16, y: 12 },
});
```

**Problema**: Arial Black 32px tem altura de glifo ~38px. Com padding y=12 em cada lado, altura total = 38 + 24 = ~62px. Largura do texto "1" a 32px ≈ 22px, "10" ≈ 38px; com padding x=16 em cada lado: "1" = 54px, "10" = 70px. Botao "1" tem ~54x62px. Parece OK.

**Porem**, o `setInteractive()` sem `hitArea` usa o bounding box do `Text` object, que a Phaser calcula baseado no canvas interno. Para textos com `backgroundColor`, a area clicavel inclui o padding e deve ser correta. **Risco real**: o espacamento de 80px entre centros dos botoes com largura de ~54-70px deixa apenas 10-26px de gap. Em touch com dedo, clicar no botao 5 pode ativar o 4 ou 6. Nao e bloqueante mas e UX ruim para o publico 40-70 anos.

**Recomendacao**: Aumentar espacamento para 100px ou usar retangulos clicaveis em vez de texto.

---

### P2 — `centerMessage` criado com `setScrollFactor(0)` mas posicionado em `GAME_WIDTH/2, GAME_HEIGHT/2` — pode ficar atras do HUD

**Arquivo**: `jogo/src/scenes/GameScene.ts:163-180`

```ts
this.centerMessage = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, msg, {
  // ...
  backgroundColor: 'rgba(0,0,0,0.75)',
  padding: { x: 40, y: 30 },
});
this.centerMessage.setOrigin(0.5);
this.centerMessage.setScrollFactor(0);
this.centerMessage.setDepth(2000);
```

**Problema**: Com `setScrollFactor(0)`, a posicao (640, 360) e em coordenadas de viewport. O centro geometrico do viewport e (640, 360). O HUD ocupa y=0..80 com depth=999/1000. O `centerMessage` tem depth=2000, entao fica na frente do HUD — correto. Mas mensagens longas (2 linhas) podem ter altura de 100-130px, fazendo com que a borda superior comece em ~295px, bem abaixo do HUD. **Nao e um bug critico**, mas se o texto for muito grande em telas menores (scale FIT), pode haver sobreposicao.

**Recomendacao**: Ajustar y para `(GAME_HEIGHT + HUD_HEIGHT) / 2` = `(720 + 80) / 2 = 400` para centralizar na area jogavel, nao na tela inteira.

---

### P2 — `niveis.json`: `grama_alta_para_cortar` significativamente menor que `playable_tiles_total` em todos os niveis

**Arquivo**: `jogo/public/assets/maps/niveis.json`

```
id=1  playable=154 grama=96  (62%)
id=2  playable=154 grama=116 (75%)
id=3  playable=154 grama=122 (79%)
id=4  playable=220 grama=183 (83%)
id=5  playable=220 grama=173 (79%)
id=6  playable=275 grama=247 (90%)
id=7  playable=275 grama=190 (69%)
id=8  playable=275 grama=221 (80%)
id=9  playable=330 grama=247 (75%)
id=10 playable=330 grama=248 (75%)
```

**Problema**: O `grama_alta_para_cortar` representa o total de tiles `TILE.TALL` que precisam ser cortados para completar a fase. Em alguns niveis (especialmente o 7), apenas 69% das celulas joggaveis sao `TALL`. Isso pode ser proposital (design intencional com flores/pedras), mas o nivel 7 tem um pico de dificuldade interrompido. **Nao ha validacao em runtime** que `grama_alta_para_cortar <= contagem real de tiles TALL`. Se o JSON estiver errado e `grama_alta_para_cortar` for maior que o numero real de tiles TALL, a fase nunca sera completavel (P0 em potencial).

**Recomendacao**: Adicionar validacao em `create()`:

```ts
const tallCount = this.level.tiles.flat().filter(t => t === TILE.TALL).length;
if (this.level.grama_alta_para_cortar > tallCount) {
  console.error(`Nivel ${this.level.id}: grama_alta_para_cortar (${this.level.grama_alta_para_cortar}) > tallCount (${tallCount}). Fase incomplestavel!`);
}
```

---

### P2 — `spawn_jogador` usa `editor_x/editor_y` em runtime mas campos `game_x/game_y` existem sem uso

**Arquivo**: `jogo/public/assets/maps/niveis.json` + `jogo/src/scenes/GameScene.ts:105-106`

```ts
this.playerTileX = this.level.spawn_jogador.editor_x;
this.playerTileY = this.level.spawn_jogador.editor_y;
```

```json
"spawn_jogador": {
  "editor_x": 6,
  "editor_y": 5,
  "game_x": 7,
  "game_y": 8
}
```

**Problema**: Os campos `game_x/game_y` existem no JSON mas nunca sao usados pelo codigo. A diferenca entre `editor_x=6` e `game_x=7` sugere um offset de coordenada diferente. Se `game_x/game_y` forem as coordenadas "corretas" para o runtime e `editor_x/editor_y` forem coordenadas do editor externo, o jogo pode estar spawnando o player no tile errado.

Para nivel 1: `editor_x=6, game_x=7`. Diferenca = 1. Para nivel 6: `editor_x=12, game_x=13`. Diferenca = 1. Para nivel 9: `editor_x=14, game_x=15`. Diferenca = 1. O `game_x = editor_x + 1` consistentemente — parece um offset de 1 tile. Se o nivel real tem uma borda/coluna extra, o spawn esta 1 tile errado.

**Recomendacao**: Clarificar qual coordenada usar. Se `editor_x` for correto (confirmado testando que o spawn esta num tile TALL ou CUT valido), documentar e remover `game_x/game_y` do JSON. Se `game_x` for o correto, corrigir o codigo para usa-lo.

---

### P3 — `worldOffsetX()` e metodo mas poderia ser propriedade cacheada

**Arquivo**: `jogo/src/scenes/GameScene.ts:145-149`

```ts
private worldOffsetX(): number {
  return this.worldW < GAME_WIDTH ? Math.round((GAME_WIDTH - this.worldW) / 2) : 0;
}
```

**Problema**: `worldOffsetX()` e chamado em `tileToPx()` que por sua vez e chamado em `update()` a cada frame (potencialmente multiplas vezes). O valor nunca muda apos o `create()`. Custo negligivel, mas e desnecessario.

**Recomendacao**: Calcular uma vez em `create()` e armazenar em `this.worldOffsetX` (campo privado).

---

### P3 — Mensagem de avanco de nivel usa `this.level.id` que e 1-indexed mas `this.levelIndex` e 0-indexed

**Arquivo**: `jogo/src/scenes/GameScene.ts:175`

```ts
`FASE ${this.level.id} COMPLETA!\n\nToque ou aperte ESPACO pra fase ${this.level.id + 1}`
```

**Avaliacao**: `this.level.id` vai de 1 a 10. `this.level.id + 1` vai de 2 a 11. Para a ultima fase (id=10), a branch `isLast` cuida da mensagem de "parabens". Para as fases 1-9, `id+1` = 2..10, correto. **Nao e um bug**, mas se `level.id` nao for sequencial (ex: buraco no JSON), a mensagem ficaria errada. Como os 10 niveis tem id=1..10 em ordem, esta OK.

---

## Riscos nao tratados

1. **Build TypeScript nao validado**: Permissao de shell negada no ambiente. Nao foi possivel executar `npm run build`. Verificacao de tipos (ex: `AllLevelsJson`, `LevelJson`, uso correto de `.on` vs `.once`) nao foi confirmada em compilacao.

2. **Teste em mobile fisico nao realizado**: Touch target de 54-70px parece adequado pelas guidelines (44x44 minimo), mas o gap entre botoes nao foi testado em dispositivo real.

3. **Performance de scroll em 30 tiles**: Com 330 tiles visiveis e camera seguindo com lerp, nao foi medido FPS em hardware mobile de entrada. O `roundPixels: true` ajuda mas nao foi medido.

4. **Validacao de `grama_alta_para_cortar` vs tiles TALL reais**: Nao foi feito parse profundo do JSON para contar tiles TALL por nivel (permissao de shell negada para Python/jq). A checagem foi apenas numerica dos campos `grama_alta_para_cortar` e `playable_tiles_total`.

5. **ESC durante loading/transition**: Se o player apertar ESC logo apos iniciar `advanceLevel()`, `scene.start('TitleScene')` conflita com o `scene.start('GameScene', ...)` em andamento. Phaser geralmente ignora o segundo, mas nao foi testado.

---

## O que esta bom

- **Deep clone do JSON** (`JSON.parse(JSON.stringify(...))`) esta correto e necessario. Com niveis de ~3.6KB cada, o custo por run e negligivel.
- **HUD scrollFactor(0)** aplicado corretamente em `hudBg` e `hudText` com depth 999/1000. Ficara fixo com camera scrollando.
- **`centerMessage` scrollFactor(0)** com depth 2000 garante que a mensagem de level clear apareca sobre tudo, incluindo o HUD.
- **`init()` reseta todos os estados criticos**: `tileGrid = []`, `cutCount = 0`, `levelCleared = false`, `dir = 'NONE'`, `centerMessage = undefined`. Na transicao de scene (`scene.start`), a Phaser chama `destroy()` em todos os GameObjects antes de `create()`, entao os tile rectangles e o `centerMessage` do nivel anterior sao destruidos automaticamente — sem acumulo de objetos.
- **`allLevels.length`** usado como limite em `advanceLevel()` em vez de hardcoded `10` — o jogo se adapta automaticamente se novos niveis forem adicionados ao JSON.
- **Dimensoes dos niveis corretas**: 3 niveis com 14 tiles, 2 com 20, 3 com 25, 2 com 30 — exatamente como especificado.
- **`canEnter` revisado**: Logica de bounds simples e correta, sem regressao em relacao ao G2.
- **Spawn em bounds**: Todos os 10 spawns com `editor_y=5` que esta dentro de `altura_tiles=11`. `editor_x` varia por nivel e esta dentro de `largura_efetiva_tiles` em todos os casos verificados.
- **`pointerdown` usa `worldX/worldY`**: Correto — com camera scrollando, `pointer.worldX` da a coordenada no espaco do mundo, nao na tela.

---

## Recomendacoes

1. **(P1 — urgente)** Corrigir `startFollow` removendo o offsetX calculado dinamicamente. Usar `this.cameras.main.startFollow(this.player, false, 0.1, 0)`.
2. **(P1 — urgente)** Adicionar guard `this.advancing` em `advanceLevel()` para prevenir double-invocation.
3. **(P1)** Substituir `.on('keydown-SPACE/ENTER')` por `.once()` ou adicionar cleanup no evento `SHUTDOWN` da scene.
4. **(P2)** Para fases com `worldW < GAME_WIDTH`, desabilitar startFollow e usar camera fixa para evitar jitter.
5. **(P2)** Adicionar validacao em runtime de `grama_alta_para_cortar <= contagem real de tiles TALL`.
6. **(P2)** Clarificar `editor_x` vs `game_x` no spawn; documentar qual e canonico ou remover o nao-utilizado.
7. **(P2)** Centralizar `centerMessage` em `(GAME_HEIGHT + HUD_HEIGHT) / 2` em vez de `GAME_HEIGHT / 2`.
8. **(P3)** Cache `worldOffsetX` como campo privado calculado em `create()`.
