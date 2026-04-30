# Scroll e tamanho das fases - Lawn Mower NES

## Tipo de scroll: HORIZONTAL SUAVE (pixel-perfect), VERTICAL NAO HA

Confirmado em 4 evidencias:

1. `setScrollBottom` (game.dasm:1536) escreve em PPU_CTRL e PPU_SCROLL com base em `GAME_CAM_X` (word, em pixels)
2. `setScrollTop` (game.dasm:1527) zera o scroll na parte de cima da tela (HUD fixo via sprite 0 split)
3. Variavel `GAME_CAM_Y` esta comentada/morta no codigo (`;sta <GAME_CAM_Y`)
4. O codigo de scroll vertical existe comentado em `setScrollBottom` (linhas 1548-1570) mas marcado como "this does not work on HW properly"

A altura do gameplay e fixa (11 tiles de 16x16 = 176 px), o que cabe inteiro na area visivel abaixo do HUD (240 px - 64 px de HUD = 176 px).

## Como a camera segue o jogador

Em `playerShow` (game.dasm:1430):

```
GAME_CAM_X = (GAME_PLR_X em pixels) - 128

clip:
  if GAME_CAM_X < 0           -> GAME_CAM_X = 0
  if GAME_CAM_X > GAME_CAM_MAX -> GAME_CAM_X = GAME_CAM_MAX
```

Onde:
- `GAME_PLR_X` esta em fixed-point 12:4, dividido por 16 vira pixels
- `128` e o "centro" da tela horizontalmente (256/2 = 128)
- `GAME_CAM_MAX` e calculado em `setField`:

```
GAME_CAM_MAX = (GAME_MAP_WDT - 14) * 16
```

(`<<4` = multiplica por 16, que e o tamanho do tile em pixels.)

A subtracao `-14` corresponde a quantidade de tiles 16x16 que cabem na tela visivel sem extrapolar a area da fase. Tela = 256 px / 16 = 16 tiles, mas com bordas e margens de seguranca, o limite efetivo e 14.

## Tamanho de cada fase

Altura fixa:
- 11 tiles 16x16 de gameplay = 176 px
- 64 px de HUD em cima
- Total da tela: 240 px (resolucao NES)

Largura por fase (em tiles 16x16):

| Fase | Largura | Pixels | Cabe sem scroll? |
|------|---------|--------|------------------|
| 01   | 14      | 224    | Sim (tela = 256, sobra)        |
| 02   | 14      | 224    | Sim                            |
| 03   | 14      | 224    | Sim                            |
| 04   | 20      | 320    | Nao - scroll necessario        |
| 05   | 20      | 320    | Nao                            |
| 06   | 25      | 400    | Nao                            |
| 07   | 25      | 400    | Nao                            |
| 08   | 25      | 400    | Nao                            |
| 09   | 30      | 480    | Nao                            |
| 10   | 30      | 480    | Nao                            |

A NES so tem 2 nametables nativos (512 px de scroll horizontal sem mirror), o que cabe perfeitamente nos 480 px da fase mais larga. O scroll sai pelos `PPU_CTRL` bit 0 (NN bit baixo) atualizando o nametable atual.

## HUD fixo via sprite 0 hit

O jogo usa a tecnica classica de NES:

1. Sprite 0 (transparente) e posicionado em y=$ab (linha 171, dentro do HUD)
2. `waitSprite0` (game.dasm:2362) bloqueia ate o PPU bater no sprite 0
3. Antes do hit, scroll = 0 (HUD fica parado em cima)
4. Apos o hit, scroll = GAME_CAM_X (gameplay rola embaixo)

Esse split ocorre em todo frame, dando a sensacao de HUD ancorado.

## Constantes de dimensao no codigo

```asm
GAME_MAP        equ $300        ; 512 bytes (32 cols x 16 rows)
GAME_FUEL_MAX   equ 58*4 = 232
GAME_LEVELS_ALL equ 10
DIR_NONE/LEFT/RIGHT/UP/DOWN = 0/1/2/3/4
```

Player Y range: 3..13 (11 linhas validas)
Player X range: 1..GAME_MAP_WDT (varia 14..30)

## Tradução para o port em JS

Pra Phaser 3:

- Resolucao base: 1280x720 (multiplo limpo de 16)
- Tile size: 64x64 px (4x maior que o NES de 16x16)
- Camera: scroll horizontal apenas, segue jogador
- Centro de camera: tile_size * 10 (similar ao "128 px" do original)
- Bounds: world width = MAP_WDT * 64, world height = (HUD_H + 11*64)
- Para fases largas (30 tiles), world width = 1920 px, scroll de ~640 px

Como a tela mobile em landscape e tipicamente 16:9 (1280x720 ou similar), a camera vai precisar mostrar:
- 1280 / 64 = 20 tiles na horizontal
- 720 / 64 = 11.25 tiles na vertical (cabe altura inteira sem scroll)

A fase mais larga (30 tiles = 1920 px) precisa de scroll de 640 px.
