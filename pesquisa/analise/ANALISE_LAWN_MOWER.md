# Analise do Lawn Mower NES

## 1. Sumario executivo

O Lawn Mower NES (Shiru, 2011) e um jogo arcade simples de cortar grama numa arena com scroll horizontal. O codigo fonte tem 6900 linhas de ASM 6502 (DASM syntax) divididas em modulo de logica, audio (FamiTone) e dados graficos (CHR-ROM com 512 tiles 8x8). Tem 10 fases de tamanho crescente (14 a 30 tiles de largura, altura fixa de 11), com timer de combustivel, obstaculos (flores e pedras) e galao bonus que respawna periodicamente. O editor incluido (Borland C++) gera o `levels.bin` e reempacota as fases dentro do proprio `patterns.chr`. As 10 fases foram totalmente decodificadas e exportadas em JSON; tiles e paletas tambem.

## 2. Estrutura do projeto original

- 11 commits no repo, ultimo em 2014, primeiro import de Shiru em 2011
- 30 arquivos no total
- Arquivos categorizados em `pesquisa/analise/01_mapeamento.txt`

Resumo:
- 5 arquivos de logica ASM (game.dasm + helpers)
- 9 arquivos de audio ASM (famitone + bgm + sfx)
- 6 arquivos de dados graficos (CHR, RLE, paletas, levels.bin)
- 8 arquivos do editor C++ (Borland Builder)
- ROM compilada (`bin/game.dasm.rom` 40976B = 32K PRG + 8K CHR + 16B header)

## 3. Linguagens e ferramentas

- **6502 ASM (DASM syntax)**: `game.dasm`, `nesdefs.dasm`, `famitone2.dasm`
- **6502 ASM (NESASM syntax)**: arquivos `.asm` (controller, palette, rle, sounds, bgm_*, title, famitone)
- **C++ (Borland Builder)**: editor de fases (`Project1.cpp`, `Unit1.cpp/h/dfm`)
- **FamiTracker**: arquivos `.ftm` em `sound/` (musicas)

Total ~6900 linhas de codigo ASM. Detalhes em `02_estrutura_codigo.md`.

Compilavel com DASM ou no [8bitworkshop](http://8bitworkshop.com).

## 4. Logica do jogo (game.dasm)

### 4.1 Variaveis principais

Zero page tem ~30 variaveis, incluindo posicao do jogador em fixed-point 12:4, direcao atual e nova, camera (CAM_X word), combustivel, contador de % cortada, timer do galao, etc. Listagem completa em `02_estrutura_codigo.md`.

RAM:
- `$0200-$02FF` OAM (sprites)
- `$0300-$04FF` GAME_MAP (mapa decodificado, 32x16 metatiles)
- `$0700+` FamiTone state

### 4.2 Constantes de balanceamento

```
GAME_FUEL_MAX     = 232    (58*4)
GAME_LEVELS_ALL   = 10
Speed inicial     = 20
Speed turbo       = 48
Speed minimo      = 16
Penalty flores    = 38     (FUEL_MAX/6)
Penalty pedra     = 77     (FUEL_MAX/3)
Galao recovery    = 232    (cheio)
```

Timer de respawn do galao por nivel (em frames a 50fps PAL):

```
Lvl 01-03 : 250, 235, 220
Lvl 04-06 : 200, 185, 170
Lvl 07-10 : 150, 150, 150, 150
```

Cada nivel tambem tem 1 cor de paleta variante (`palList`):

```
01 cyan   02 magenta  03 orange  04 green   05 cherry
06 brown  07 green2   08 red     09 cyan2   10 green3
```

### 4.3 Loop principal

`mainLoop` (linha 560) faz:

1. waitNMI / setScrollTop / updateOAM
2. updateVideo (palUpdate, redesenha 1 tile, atualiza HUD)
3. statusSplit (waitSprite0 + setScrollBottom)
4. FamiToneUpdate
5. checkPad -> playerMove ou pause
6. checkTile -> cutGrass/Flowers/Stone/Fuel
7. updateFuelBar / chrAnimation
8. Se done_cnt = 0 -> levelClear, se fuel = 0 -> outOfFuel

### 4.4 Subrotinas criticas

| Subrotina         | Funcao                                          |
|-------------------|-------------------------------------------------|
| `setField`        | Decompacta nivel do CHR pra GAME_MAP            |
| `playerMove`      | Aplica delta XY com fixed-point                 |
| `checkTile`       | Detecta tipo de tile sob jogador, dispara acao  |
| `cutGrass`        | Substitui $0e..$11 -> $0a..$0d, incrementa DONE |
| `playerShow`      | Renderiza sprite, atualiza GAME_CAM_X           |
| `updateTile`      | Reescreve 1 tile no nametable + attribute      |
| `setScrollBottom` | Pixel-perfect scroll horizontal                 |

Tabela completa em `02_estrutura_codigo.md`.

## 5. Camera e scroll

- **Tipo**: scroll horizontal suave (pixel-perfect), sem scroll vertical
- **Como funciona**: `GAME_CAM_X = (PLR_X em pixels) - 128`, com clipping em [0, GAME_CAM_MAX]
- **GAME_CAM_MAX** = `(GAME_MAP_WDT - 14) * 16` em pixels
- **HUD fixo**: split via sprite 0 hit, parte de cima fica em scroll 0

Detalhes em `04_scroll_e_fases.md`.

## 6. Dados das 10 fases

**LOCALIZADAS E DECODIFICADAS**. Estao em 2 lugares no repo original:

1. `editor/levels.bin` (3340B): formato fonte usado pelo editor C++
   - 3300 bytes de mapa (30x11x10) + 40 bytes de params (4 bytes/nivel)
2. `patterns.chr` offset 4096 (950B): formato runtime usado pelo jogo
   - 95 bytes/nivel (88 packed 2-bit + 7 metadata)

Os dois formatos batem perfeitamente e estao exportados em:
- `assets-extraidos/fases_editor.json` (limpo, recomendado)
- `assets-extraidos/fases_runtime.json` (formato compactado decodificado)
- `assets-extraidos/fase_01.json` (so a fase 1 como exemplo)

Resumo das fases:

| Fase | Largura | Spawn | Grama alvo |
|------|---------|-------|------------|
| 01   | 14      | (7,8) | 96         |
| 02   | 14      | (7,8) | 116        |
| 03   | 14      | (7,8) | 122        |
| 04   | 20      | (6,8) | 183        |
| 05   | 20      | (3,8) | 173        |
| 06   | 25      | (13,8)| 247        |
| 07   | 25      | (3,8) | 190        |
| 08   | 25      | (3,8) | 221        |
| 09   | 30      | (15,8)| 247        |
| 10   | 30      | (15,8)| 248        |

A primeira fase mais larga que a tela e a de numero 4 (largura 20 > 14 visiveis).

## 7. Sprites (patterns.chr)

- Total: 512 tiles 8x8
- Pattern table 0 (0-255): sprites do jogador, galao, fuel bar, ! e numeros do HUD
- Pattern table 1 (256-511): backgrounds (grama, flores, pedras, bordas, letras "LEVEL", "OUT OF FUEL", etc)

**Importante**: os primeiros ~60 tiles do pattern table 1 estao sobreescritos com os dados das 10 fases (95 bytes * 10 = 950 bytes, ocupando os primeiros 60 tiles). Esse trecho aparece como "lixo" visual nas extracoes mas e dado, nao grafico.

PNG extraidos:
- `assets-extraidos/patterns_grayscale.png` (16x32 grid escala 4x, paleta cinza)
- `assets-extraidos/patterns_lawn.png` (mesma grid, paleta verde-grama)

## 8. Paletas

4 paletas nomeadas em `palette.asm`:
- `palTitle`: tela de titulo (3 sub-paletas BG)
- `palGameSprites`: sprites no gameplay (3 sub-paletas SPR)
- `palGame`: backgrounds no gameplay (3 sub-paletas BG)
- `palDone`: tela final (4 sub-paletas BG)

Cada sub-paleta tem 4 cores indexadas na NES master palette (64 cores).

Plus 10 cores de variante por nivel (em `game.dasm:palList`), cada uma com 3 indices que sobrescrevem PAL_DATA+1, PAL_DATA+2 e PAL_DATA+7 ao iniciar a fase.

JSON completo: `assets-extraidos/palettes.json`.

## 9. Editor de fases

Pasta `editor/` contem editor Windows (Borland C++ Builder) que:
- Le/escreve `levels.bin` no formato fonte
- Reempacota e injeta no `patterns.chr` offset 4096 ao fechar
- Permite rotacionar mapas, ajustar largura, marcar spawn

Detalhes completos em `03_editor.md`.

## 10. Recomendacoes pra implementacao JS

### 10.1 Stack escolhida: Phaser 3 + TypeScript + Vite

- Phaser 3 maduro, lida bem com canvas + WebGL automaticamente
- TypeScript pra tipar entidades (Player, Tile, Level)
- Vite pra dev rapido + build estatico em GitHub Pages
- Deploy: GitHub Pages (zero custo) via `dist/`

### 10.2 Tamanho de tile sugerido (64x64)

- NES original = 16x16 px metatile (4 tiles 8x8)
- Multiplicar 4x = 64x64 px no jogo
- Sprite do jogador (Gentileza) = ~96x96 px (1.5 tiles)
- Tela base 1280x720 mostra 20x11 tiles
- Cabe uma fase inteira de largura 14 sem scroll
- Fases 20+ precisam scroll horizontal (suave, segue player)

### 10.3 Estrutura de dados pra mapas

```typescript
type TileType = 'cut' | 'tall' | 'flowers' | 'stone';

interface LevelData {
  id: number;
  width: number;       // tiles (14..30)
  height: number;      // sempre 11
  spawn: { x: number; y: number };
  cutTarget: number;   // tiles tipo 'tall' a cortar
  fuelTimer: number;   // ms ate proximo galao
  paletteName: string; // 'cyan', 'green', etc
  tiles: TileType[][]; // [row][col]
}
```

Carregar de JSON exportado em `assets-extraidos/fases_editor.json` com mapeamento 0=cut, 1=tall, 2=flowers, 3=stone.

### 10.4 Pontos de atencao

1. **Publico 40-70**: tiles e jogador grandes (64+ px), botoes de touch grandes (>= 96 px), fonte do HUD >= 32 px
2. **Mobile-first**: lock landscape, viewport sem zoom, controles touch alem de teclado
3. **Sem scroll vertical**: simplifica tudo, segue o original
4. **Camera centralizada no jogador** com bounds da fase
5. **Tile snap**: jogador se move livremente em pixels, mas o "corte" so ocorre quando ele entra inteiro em um tile novo (similar ao GAME_PLR_OFF do original)
6. **Reusar logica de spawn de galao**: posicao aleatoria em tile de grama alta, com timer
7. **Bordas da arena**: tile $01..$09 sao decorativos. Pode usar 1 sprite de moldura unica

## 11. Pendencias pra investigar depois

- [ ] Decodificar musicas FamiTone pra encontrar equivalentes em audio (web audio ou tone.js)
- [ ] Olhar `done.rle` e `title.rle` pra entender layout das telas estaticas
- [ ] Ver se faz sentido portar o cheat de pular fase (UURL no titulo)
- [ ] Testar se as 4 variantes aleatorias de grama agregam valor visual ou pode ser 1 sprite so
- [ ] Avaliar transicoes de fase (fadeIn/fadeOut) - vale animar via tween Phaser?
- [ ] Decidir se os 10 layouts originais sao reusados literalmente ou se ha 10 novos pro contexto Terra Gentil
