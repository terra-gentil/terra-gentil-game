# QA G0 - Relatorio pass-01

**Sprint**: G0 — Engenharia Reversa do Lawn Mower NES + Scaffolding Phaser 3  
**Data**: 2026-04-30  
**Reviewer**: Sub-agente Sonnet G0 pass-01  
**Commits revisados**: 2dfab0d (G0 principal), 18d8f27 (LICENSE), a7db08a (hotfix placeholder)  
**Build validado**: nao (permissao de shell negada no ambiente; analise estatica manual + leitura direta do ASM/C++ originais)

---

## Cobertura

| Area | O que foi lido | Status |
|------|----------------|--------|
| `ANALISE_LAWN_MOWER.md` — claims sobre fuel, speed, scroll | Lido completamente, verificado contra `game.dasm` | Coberto |
| `ANALISE_LAWN_MOWER.md` — tabela de fases (largura, spawn, grama) | Verificado contra `fases_editor.json` e `fases_runtime.json` | Coberto |
| `ANALISE_LAWN_MOWER.md` — tile codes | Verificado contra `game.dasm` (linhas 1800-1825) | Coberto |
| `ANALISE_LAWN_MOWER.md` — paletas (contagem de sub-paletas) | Verificado contra `palette.asm` linhas 207-217 | Coberto |
| `extract_levels.py` — logica de parsing de `levels.bin` | Lido completamente, verificado contra `Unit1.cpp` (C++ editor) | Coberto |
| `extract_levels.py` — logica de parsing do CHR runtime | Lido completamente, verificado contra packing no `Unit1.cpp` | Coberto |
| `extract_levels.py` — calculo de `fuel_inc` | Verificado contra formula C++ original `(int)(100.0f*256.0f/tcnt)` | Coberto |
| `extract_palette.py` — regex de parsing | Analise estatica completa do regex e seus efeitos | Coberto |
| `extract_chr.py` — decodificacao CHR-ROM | Verificado formato NES 2bpp plane0/plane1 | Coberto |
| `fases_editor.json` / `fases_runtime.json` — bem formados? | Verificados campos chave, spawn coords cruzados entre os dois | Coberto |
| `palettes.json` — correto? | Verificado contra `palette.asm` e analise do bug do parser | Coberto |
| `jogo/src/` scaffolding — GameScene, TitleScene, BootScene | Lidos completamente no commit 2dfab0d | Coberto |
| `jogo/src/config/GameConfig.ts` | Lido completamente | Coberto |
| `jogo/package.json`, `tsconfig.json`, `vite.config.ts` | Lidos completamente | Coberto |
| `.gitignore` / `jogo/.gitignore` | Lidos, verificados para secrets | Coberto |
| `pesquisa/analise/02_estrutura_codigo.md` | Lido completamente, linhas de subrotina verificadas | Coberto |
| `pesquisa/analise/03_editor.md` | Lido completamente, formato verificado contra `Unit1.cpp` | Coberto |
| `pesquisa/analise/04_scroll_e_fases.md` | Lido completamente, formula CAM_MAX verificada no ASM | Coberto |
| Musicas FamiTone (bgm_*.asm, sounds.asm) | NAO cobertos (out of scope G0) | Gap |
| `done.rle`, `title.rle`, `title.asm` | NAO lidos (fora do foco desta pass) | Gap |
| `patterns.chr` bytes brutos | NAO lidos diretamente (confiamos nas extractions) | Gap |

---

## Achados

### P1 — Bug no parser de paletas: ultimo byte de cada paleta e silenciosamente descartado

**Arquivo**: `pesquisa/analise/extract_palette.py:80-90` (funcao `parse_named_palette`)  
**Evidencia no JSON**: `pesquisa/analise/assets-extraidos/palettes.json` — `total_bytes: 15` para `palTitle`, `palGameSprites` e `palGame` (deveriam ser 16 cada)

**Causa raiz**: O regex captura os dados da paleta com o grupo `[\$\w\s,]+`, onde `\s` inclui newlines. O grupo ganha o ultimo token da linha como `$30\n\npalGameSprites\n\t` (proxima label anexada). O `.strip()` nao remove newlines embutidas em posicao mediana, entao o token se torna `$30\n\npalGameSprites`, que comeca com `$` mas `int('30\n\npalGameSprites', 16)` lanca `ValueError` — silenciosamente ignorado pelo `except ValueError: pass`.

**Impacto**: A 4a sub-paleta de 3 das 4 paletas nomeadas esta ausente do `palettes.json`:
- `palTitle` perde sub-paleta `{$0f, $0b, $29, $30}` — cor de fundo principal
- `palGameSprites` perde sub-paleta `{$0f, $0f, $00, $30}` — preto transparente
- `palGame` perde sub-paleta `{$0f, $0a, $10, $20}` — terra do jogo
- `palDone` esta correta (ultima paleta no arquivo, sem texto apos ela)

**Trecho do ASM correto** (`palette.asm:208`):
```
palTitle
    .byte $0f,$0b,$28,$39,$0f,$0b,$16,$38,$0f,$0b,$1a,$29,$0f,$0b,$29,$30
                                                              ^^^^^^^^^^^^^^^^ 4a sub-paleta PERDIDA
```

**Recomendacao**: Substituir regex `[\$\w\s,]+` por uma abordagem que so captura a linha atual. Por exemplo, usar `[^\n]+` no lugar do grupo greedy ou iterar linha a linha:
```python
pattern = rf'^{re.escape(label)}\s*\n(\s*\.byte[^\n]*\n)+'
# ou simplificar para ler linha por linha apos encontrar o label
```

---

### P1 — ANALISE_LAWN_MOWER.md reporta "3 sub-paletas" quando sao 4

**Arquivo**: `pesquisa/analise/ANALISE_LAWN_MOWER.md` — Secao 8  
**Linha relevante**: Bloco da secao 8, descricao de `palTitle`, `palGameSprites`, `palGame`

**Texto atual**:
> `palTitle`: tela de titulo (3 sub-paletas BG)  
> `palGameSprites`: sprites no gameplay (3 sub-paletas SPR)  
> `palGame`: backgrounds no gameplay (3 sub-paletas BG)

**Correto**: Cada paleta NES tem sempre 16 bytes = 4 sub-paletas de 4 cores. Verificado em `palette.asm:208-214`. O erro na documentacao e consequencia direta do bug P1 acima (o parser produzia 15 bytes = 3 sub-paletas).

**Recomendacao**: Corrigir para "(4 sub-paletas)" em todas as tres entradas.

---

### P1 — `extract_levels.py` usa `round()` onde o jogo original usa truncamento inteiro

**Arquivo**: `pesquisa/analise/extract_levels.py:69`  
**Trecho**:
```python
'fuel_inc_por_tile_8_8': round(100 * 256 / cut_target) if cut_target else 0,
```

**Correto** (do `editor/src/Unit1.cpp:471`):
```c
data[pp++]=((int)(100.0f*256.0f/tcnt))&255;
data[pp++]=((int)(100.0f*256.0f/tcnt))/256;
```

`(int)` em C++ faz truncamento (floor para positivos), nao arredondamento. Isso causa discrepancias para varios niveis:

| Fase | grama_alta | Python round() | C++ floor | Diferenca |
|------|-----------|---------------|-----------|-----------|
| 01   | 96         | 267           | 266       | +1        |
| 02   | 116        | 221           | 220       | +1        |
| 03   | 122        | 210           | 209       | +1        |
| 06   | 247        | 104           | 103       | +1        |
| 07   | 190        | 135           | 134       | +1        |
| 09   | 247        | 104           | 103       | +1        |

O campo `fuel_inc_por_tile_8_8` no `fases_editor.json` esta sistematicamente 1 unidade acima do valor real que o jogo NES usa. Para o port JS, a progressao de porcentagem sera ligeiramente mais rapida que o original.

O campo correto esta em `fases_runtime.json` como `meta_done_inc_8_8`, lido diretamente do binario compilado pelo editor C++.

**Recomendacao**: Trocar `round()` por `int()` (ou `math.floor()`) na linha 69. Confirmar que o runtime JSON e a fonte autoritativa para este valor.

---

### P1 — `03_editor.md` documenta formula de `inc` com `round()` ao inves de `floor()`

**Arquivo**: `pesquisa/analise/03_editor.md` — secao "Formato de fase no patterns.chr"  
**Trecho atual**:
```
+2 bytes : inc LE    (incremento de % por corte = round(100*256/tcnt))
```

**Correto**: `floor(100.0*256.0/tcnt)` ou em C `(int)(100.0f*256.0f/tcnt)`.  
Consequencia do mesmo equivoco identificado no achado anterior.

**Recomendacao**: Corrigir para `int(100*256/tcnt)` (truncamento, nao arredondamento).

---

### P2 — Tile code $14-$15 como "pedra 2 variantes" e incorreto: checkTile so reconhece $14

**Arquivo**: `pesquisa/analise/02_estrutura_codigo.md` — Tabela "Codigos de tile"  
**Trecho**:
```
| $14-$15 | Pedra (2 variantes)                            |
```

**Evidencia no ASM** (`game.dasm:1815-1817`):
```asm
cmp #$14
bne .noStone
jmp cutStone
```

`checkTile` compara exatamente com `$14`. Um tile `$15` cai no branch `.noFuel` (sem correspondencia) e dispara `SFX_MUTE`. A entrada `tilesList` (linha 2626) repete `$14` quatro vezes como variantes de animacao CHR, mas isso nao implica que `$15` seja um tile valido de gameplay.

**Recomendacao**: Alterar para `$14 = Pedra (tile unico, 4 frames de animacao CHR)` na tabela.

---

### P2 — GameScene.ts (G0 pre-hotfix): `Math.ceil` em gridRows causa HUD nunca atingir 100%

**Arquivo**: `jogo/src/scenes/GameScene.ts` (commit 2dfab0d) — linhas 18-19  
**Trecho no G0**:
```typescript
const gridCols = Math.ceil(GAME_WIDTH / TILE_SIZE);  // 20 — OK
const gridRows = Math.ceil(GAME_HEIGHT / TILE_SIZE); // ceil(11.25) = 12 — ERRADO
```

O player e clampado a `[32, 688]` pixels em Y. O tile mais baixo alcancavel e `floor(688/64) = 10` (row index 0-based), ou seja, 11 rows totais (0-10). A row 11 (y=704+) nunca e pisada, logo nunca e marcada como cortada e o HUD fica eternamente em ~95%.

**Status**: Corrigido em commit a7db08a (dentro do escopo G0 pelo enunciado). Hotfix esta correto — usa `Math.floor` em gridRows e `totalTiles`. Nao ha regressao.

---

### P2 — ANALISE menciona "brown" na tabela de palList, mas ASM e palettes.json dizem "light brown"

**Arquivo**: `pesquisa/analise/ANALISE_LAWN_MOWER.md` — Secao 4.2  
**Trecho atual**:
```
06 brown
```

**Evidencia** (`game.dasm:2634`):
```asm
.byte $18,$28,$25   ;light brown
```

O comentario oficial no ASM e "light brown". O `palettes.json` tambem registra `"descricao": "light brown"`.

**Recomendacao**: Alterar para `06 light brown` na tabela da secao 4.2.

---

### P2 — `extract_palette.py`: regex `[\$\w\s,]+` e semanticamente fragil (causa do bug P1)

**Arquivo**: `pesquisa/analise/extract_palette.py:78-80`  
**Trecho**:
```python
pattern = rf'^{re.escape(label)}\s*\n\s*\.byte\s+([\$\w\s,]+)'
m = re.search(pattern, content, re.MULTILINE)
```

Mesmo corrigindo o bug de truncamento do ultimo byte, o regex continua consumindo texto alem da linha de dados (labels subsequentes ficam concatenados ao ultimo token). Funciona corretamente so por acidente: labels como `palGameSprites` nao comecam com `$`, entao sao filtrados — mas causam `ValueError` no ultimo byte da linha anterior.

**Recomendacao**: Usar regex ancorado a uma unica linha:
```python
pattern = rf'^{re.escape(label)}\s*\n\s*\.byte\s+([^\n]+)'
```
E iterar sobre `.byte` subsequentes se a paleta ocupar multiplas linhas.

---

### P3 — `markTileCut` em GameScene.ts: busca O(n) em `children.list` a cada tile cortado

**Arquivo**: `jogo/src/scenes/GameScene.ts` — linhas 115-125 (commit 2dfab0d / a7db08a)  
**Trecho**:
```typescript
const tiles = this.children.list.filter(obj => {
  return obj instanceof Phaser.GameObjects.Rectangle &&
         obj.getData('gridX') === gridX && ...
});
```

Em cada tile cortado, percorre todos os game objects. Para um grid 20x11=220 tiles + outros objetos, e O(n) por corte, aceitavel no placeholder mas deve ser substituido por lookup via Map/array indexado por `gridX,gridY` quando assets reais chegarem.

**Recomendacao**: Em G2+, usar `Map<string, Phaser.GameObjects.Rectangle>` indexado por `${gridX},${gridY}` para O(1).

---

### P3 — `.gitignore` duplica entradas entre raiz e `jogo/.gitignore`

**Arquivo**: `.gitignore` (raiz) e `jogo/.gitignore`

Entradas redundantes: `node_modules/` e `jogo/node_modules/` ambas na raiz; `.vscode/` na raiz vs `.vscode/*` + `!.vscode/extensions.json` em `jogo/`. Nao causa problemas funcionais, apenas ruido.

---

### P3 — `ANALISE_LAWN_MOWER.md` diz "DASM syntax" para `game.dasm` mas o arquivo diz "NESASM3"

**Arquivo**: `pesquisa/analise/ANALISE_LAWN_MOWER.md` — Secao 3  
**Trecho**:
```
6502 ASM (DASM syntax): game.dasm, nesdefs.dasm, famitone2.dasm
```

**Evidencia** (`game.dasm:3`):
```
;Compile with NESASM3
```

A extensao `.dasm` causou a classificacao incorreta. NESASM3 e DASM sao assemblers diferentes. `nesdefs.dasm` usa `processor 6502` que e diretiva DASM, criando ambiguidade genuina no repo original. Para o port JS, isso nao tem impacto pratico.

---

## Riscos nao tratados

1. **Paletas para o port**: Com o `palettes.json` incompleto (3 de 4 paletas com sub-paleta faltando), qualquer sprint que importe as paletas diretamente do JSON producira cores erradas. O risco e de regressao silenciosa quando telas de titulo/game/done forem implementadas.

2. **`fuel_inc` incorreto em `fases_editor.json`**: Se o port usar `fuel_inc_por_tile_8_8` do JSON do editor em vez do `meta_done_inc_8_8` do runtime, a progressao de porcentagem sera ligeiramente mais rapida que o NES original. Para 6 das 10 fases, o player chegaria a 100% 1 tile antes do previsto.

3. **Tiles de codigo `$15` e acima nao mapeados**: O mapeamento 2-bit `{0,1,2,3} -> {cut,tall,flowers,stone}` esta correto, mas o campo `4-7` no `fases_editor.json` (tiles extras) e listado como `extra_4..extra_7` sem definicao. Se alguma fase usar esses valores, o port os ignorara silenciosamente.

---

## O que esta bom

- **Engenharia reversa de alto nivel**: As claims principais da ANALISE — fuel_max=232, speed inicial=20, speed turbo=48, speed min=16, 10 fases, altura fixa 11 tiles, fuelTimeList com valores corretos — estao todas corretas e verificadas contra o ASM.

- **Formula de GAME_CAM_MAX**: A formula `(GAME_MAP_WDT - 14) * 16` em pixels esta corretamente derivada do ASM (`adc #-14` + 4 shifts left = `*16`), e corretamente documentada em `04_scroll_e_fases.md`.

- **Spawn coords nos JSONs**: Os offsets `+1` em X e `+3` em Y para converter coordenadas do editor para coordenadas do jogo estao corretos — confirmados pelo C++ do editor (`Unit1.cpp:414-415`).

- **Packing/unpacking 2-bit no CHR**: `extract_levels.py` implementa corretamente o mesmo algoritmo do C++ — empacotamento MSB-first, 4 valores por byte, 32 colunas x 11 linhas por fase.

- **Tabela de fases do ANALISE**: Todos os 10 valores de largura, spawn e grama_alvo batem com os dois JSONs extraidos (editor e runtime).

- **`extract_chr.py`**: Implementacao do CHR-ROM NES 2bpp (plane0/plane1, bit MSB-first) esta correta e producao dos PNGs esta tecnicamente sadia.

- **Scaffolding Phaser 3**: `GameConfig.ts` esta bem estruturado — `Scale.FIT`, `pixelArt: true`, `roundPixels: true`, `activePointers: 3`, landscape lock via CSS. Decisoes de arquitetura coerentes com o target de publico 40-70 (tiles grandes, fonte grande no HUD).

- **Hotfix a7db08a esta correto**: A correcao de `Math.ceil` -> `Math.floor` em gridRows e totalTiles resolve o bug do HUD em 95%, e a justificativa no commit message (20 cols x 11 linhas = 220 tiles) esta matematicamente certa.

- **Nenhum secret vazado**: `.gitignore` esta correto em excluir `lawn-mower-original/`, `.env`, node_modules. LICENSE e atribuicao ao Shiru estao presentes.

- **TypeScript config rigoroso**: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — boa higiene de build.

---

## Recomendacoes para sprints futuras

1. **Corrigir `extract_palette.py` antes de usar paletas** (P1 ativo): A G2+ que implementar telas precisara de paletas corretas. Correcao e simples (2-3 linhas).

2. **Usar `meta_done_inc_8_8` de `fases_runtime.json` como fonte autoritativa para incremento de %**, nao `fuel_inc_por_tile_8_8` de `fases_editor.json`.

3. **Manter `fases_editor.json` como formato de entrada de dados**, nao `fases_runtime.json` — o editor JSON tem tiles semanticos (0=cut, 1=tall, 2=flowers, 3=stone) enquanto o runtime tem 2-bit compactado em grid 32-col. O editor JSON e mais facil de consumir.

4. **Definir formalmente o contrato de `TileType`** antes de G2 expandir o rendering: o tipo sugerido na secao 10.3 do ANALISE (`'cut' | 'tall' | 'flowers' | 'stone'`) e correto — codificar como TypeScript enum ou union type.

5. **Physics arcade esta registrada mas nao usada** em GameScene G0 — avaliar se manter ou remover da config antes que o bundle fique grande.

6. **`markTileCut`** deve ser refatorado para lookup indexado (Map) quando tiles reais chegarem na G2.
