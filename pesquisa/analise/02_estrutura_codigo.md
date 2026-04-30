# Estrutura de Codigo - Lawn Mower NES

## Linhas por arquivo (total / sem comentarios e linhas vazias)

| Arquivo            | Total | Codigo |
|--------------------|------:|-------:|
| game.dasm          | 2664  | 2260   |
| famitone2.dasm     | 1242  | 906    |
| famitone.asm       | 1024  | 833    |
| sounds.asm         | 1125  | 1124   |
| title.asm          | 334   | 294    |
| bgm_game.asm       | 342   | 337    |
| bgm_welldone.asm   | 287   | 282    |
| bgm_title.asm      | 264   | 259    |
| palette.asm        | 217   | 191    |
| nesdefs.dasm       | 184   | 133    |
| bgm_instruments.asm|  90   |  90    |
| controller.asm     |  61   |  52    |
| bgm_levelclear.asm |  58   |  53    |
| bgm_outoffuel.asm  |  55   |  50    |
| rle.asm            |  44   |  37    |
| TOTAL              | ~7991 | ~6901  |

(Nao conta famitone2.dasm porque nao e includado em game.dasm; o jogo usa famitone.asm.)

## Principais subrotinas em game.dasm

| Linha | Subrotina             | Funcao                                          |
|-------|-----------------------|-------------------------------------------------|
| 129   | reset                 | Entry point pos-power-on / reset                |
| 167   | clearVRAM             | Zera a VRAM no boot                             |
| 191   | detectNTSC            | Detecta NTSC vs PAL (Shiru's blargg trick)      |
| 226   | initGame              | Roda showTitle e zera GAME_LEVEL                |
| 232   | initLevel             | Inicializa estado da fase atual                 |
| 262   | setField              | Decodifica nivel do CHR pra GAME_MAP            |
| 469   | drawField             | Renderiza GAME_MAP no nametable                 |
| 503   | setSprite0            | Setup sprite 0 pro split scroll do HUD          |
| 560   | mainLoop              | Loop principal do gameplay                      |
| 596   | statusSplit           | Sprite 0 hit + scroll split (HUD em cima)       |
| 673   | checkPad              | Le D-pad e seta GAME_DIR_NEW                    |
| 792   | playerMove            | Aplica delta x,y, clipping nas bordas           |
| 977   | levelClear            | Animacao + jingle de fim de fase                |
| 1061  | gameClear             | Final do jogo (10 fases concluidas)             |
| 1138  | outOfFuel             | Game over por combustivel                       |
| 1208  | showMessage           | Banner que cruza a tela                         |
| 1430  | playerShow            | Renderiza jogador, atualiza GAME_CAM_X          |
| 1527  | setScrollTop          | NN bits + scroll 0,0 (parte HUD)                |
| 1536  | setScrollBottom       | Scroll horizontal pixel-perfect                 |
| 1585  | chrAnimation          | Anima padroes do CHR (jogador, agua, etc)       |
| 1612  | fuelUpdate            | Anima sprite do galao no campo                  |
| 1632  | fuelUpdateTime        | Decrementa timer + spawna galao                 |
| 1717  | fuelSetTimer          | Reseta timer com base no nivel                  |
| 1732  | setSpeed              | Recalcula GAME_SPEEDP / GAME_SPEEDM             |
| 1756  | checkTile             | Detecta tipo de tile sob o jogador              |
| 1829  | cutGrass              | Tile virou grama cortada, incrementa GAME_DONE  |
| 1855  | cutFlowers            | Tile flores: -fuel/6                            |
| 1878  | cutStone              | Tile pedra: -fuel/3 + shake                     |
| 1887  | cutFuel               | Pegou galao: GAME_FUEL = MAX                    |
| 1982  | updateFuelBar         | Renderiza barra de combustivel via sprites OAM  |
| 2096  | updateTile            | Reescreve 1 tile no nametable + attribute       |
| 2336  | rand                  | LFSR pseudo-aleatorio                           |

## Variaveis em zero page (dump completo)

| Endereco  | Nome                | Tipo               | Funcao                                    |
|-----------|---------------------|--------------------|-------------------------------------------|
| $00       | TEMP / PAD_BUF      | byte / 3 bytes     | Temporario geral / buffer leitura controle|
| $40-$5F   | PAL_DATA            | 32 bytes           | Copia da paleta atual                     |
| $b1       | GAME_CHECK_EXIT     | byte               | Flag pra reavaliar saida da fase          |
| $b2       | GAME_DONE_SCR       | byte               | Ultimo % desenhado na tela                |
| $b3       | GAME_GRASS_TYPE     | byte               | Tipo de animacao de corte ($00/$da/$ea)   |
| $b4       | GAME_LSKIP          | byte               | Cheat de pular nivel (UURL)               |
| $b5-$b6   | GAME_FUEL_NPTR      | word               | Ponteiro pra proximo galao spawnado       |
| $b7       | GAME_FUEL_NY        | byte               | Y do proximo galao                        |
| $b8       | GAME_FUEL_NX        | byte               | X do proximo galao                        |
| $b9       | GAME_BOOST          | byte               | Flag turbo (botao A/B segurado)           |
| $ba       | GAME_CAM_SHAKE      | byte               | Flag shake da camera (pedra)              |
| $bc-$bd   | GAME_FUEL_TIME      | word               | Timer pra spawnar proximo galao           |
| $be-$bf   | GAME_FUEL_PTR       | word               | Ponteiro pro tile do galao atual          |
| $c0       | GAME_FUEL_Y         | byte               | Y do galao no campo                       |
| $c1       | GAME_FUEL_X         | byte               | X do galao no campo                       |
| $c2       | GAME_FLASH_CNT      | byte               | Contador de piscar do "press start"       |
| $c3       | GAME_DELAY          | byte               | Contador generico (intro, fim, msgs)      |
| $c4       | GAME_CHR_ANIM       | byte               | PPU_CTRL pra animar CHR                   |
| $c5       | GAME_DIR_PREV       | byte               | Ultima direcao para sprite                |
| $c6       | GAME_PAUSED         | byte               | Flag de pausa                             |
| $c7-$c8   | GAME_CAM_MAX        | word               | Limite max de scroll horizontal           |
| $c9       | GAME_MAP_WDT        | byte               | Largura do mapa atual em tiles 16x16      |
| $ca       | GAME_LEVEL          | byte               | Indice 0..9 do nivel                      |
| $cb       | GAME_FUEL           | byte               | Combustivel atual (0..GAME_FUEL_MAX=232)  |
| $cc-$cd   | GAME_DONE_CNT       | word               | Quanto falta cortar pra terminar          |
| $ce-$cf   | GAME_DONE_INC       | word fixed 8:8     | Incremento por tile cortado               |
| $d0-$d1   | GAME_DONE           | word fixed 8:8     | Porcentagem feita                         |
| $d2       | GAME_UPDATE_Y       | byte               | Y do tile a redesenhar                    |
| $d3       | GAME_UPDATE_X       | byte               | X do tile a redesenhar                    |
| $d4       | GAME_SPEED          | byte               | Velocidade base (16=parado, 48=turbo)     |
| $d5-$d6   | GAME_CAM_X          | word               | Scroll horizontal em pixels               |
| $d7       | GAME_PLR_TY         | byte               | Y do tile sob o jogador                   |
| $d8       | GAME_PLR_TX         | byte               | X do tile sob o jogador                   |
| $d9-$da   | GAME_PLR_OFF        | word fixed 12:4    | Offset acumulado dentro de 1 tile         |
| $db-$dc   | GAME_PLR_DY         | word fixed 12:4    | Delta Y por frame                         |
| $dd-$de   | GAME_PLR_DX         | word fixed 12:4    | Delta X por frame                         |
| $df-$e0   | GAME_SPEEDM         | word fixed 12:4    | Speed negativo (esquerda/cima)            |
| $e1-$e2   | GAME_SPEEDP         | word fixed 12:4    | Speed positivo (direita/baixo)            |
| $e3-$e4   | GAME_TILE_ADR       | word               | Endereco do tile sendo testado            |
| $e5       | GAME_DIR_NEW        | byte               | Direcao requisitada pelo input            |
| $e6       | GAME_DIR            | byte               | Direcao atual (1=L 2=R 3=U 4=D)           |
| $e7-$e8   | GAME_PLR_Y          | word fixed 12:4    | Posicao Y do jogador                      |
| $e9-$ea   | GAME_PLR_X          | word fixed 12:4    | Posicao X do jogador                      |
| $eb       | GAME_NTSC           | byte               | 0 = PAL, !=0 = NTSC                       |
| $ee       | PAL_MODE            | byte               | 0=normal 1=fade in 2=fade out             |
| $ef       | PAL_BRIGHT          | byte               | Brilho global (0..192)                    |
| $f0-$f6   | FT_TEMP             | 7 bytes            | FamiTone usa                              |
| $f7       | PAD_STATET          | byte               | Tecla nova nesse frame (edge)             |
| $f8       | PAD_STATEP          | byte               | Estado anterior do controle               |
| $f9       | PAD_STATE           | byte               | Estado atual do controle                  |
| $fd       | RAND_SEED           | byte               | Seed do rand                              |
| $fe       | FRAME_CNT2          | byte               | Contador secundario                       |
| $ff       | FRAME_CNT           | byte               | Contador de frames                        |

## Variaveis em RAM ($0200-$07FF)

| Endereco  | Nome              | Tamanho     | Funcao                                      |
|-----------|-------------------|-------------|---------------------------------------------|
| $0200     | OAM_PAGE          | 256 bytes   | Buffer OAM (sprites)                        |
| $0300     | GAME_MAP          | 512 bytes   | Mapa atual decodificado (32x16 tiles 16x16) |
| $0700     | FT_BASE_ADR       | ~256 bytes  | Estado interno do FamiTone                  |

## Constantes de balanceamento

| Constante           | Valor    | Significado                                     |
|---------------------|----------|-------------------------------------------------|
| GAME_FUEL_MAX       | 58*4=232 | Combustivel maximo                              |
| GAME_LEVELS_ALL     | 10       | Total de fases                                  |
| Speed inicial       | 20       | GAME_SPEED inicial em cada fase                 |
| Speed max (turbo)   | 48       | Quando A/B segurado, sobe ate 48                |
| Speed min           | 16       | Velocidade minima sem input                     |
| Penalty flores      | MAX/6=38 | Combustivel perdido ao passar em flores         |
| Penalty pedra       | MAX/3=77 | Combustivel perdido ao passar em pedra          |
| Recovery galao      | MAX(232) | Galao restaura tudo                             |
| Tiles 8x8 totais    | 512      | patterns.chr (4KB sprites + 4KB BG)             |
| Tile metatile       | 16x16    | Cada tile do mapa = 4 tiles 8x8                 |
| Mapa altura         | 11 fixo  | Linhas de gameplay (Y range 3..13)              |
| Mapa largura        | 14..30   | Varia por fase                                  |

## Direcoes

```
DIR_NONE  = 0   ; jogador parado
DIR_LEFT  = 1
DIR_RIGHT = 2
DIR_UP    = 3
DIR_DOWN  = 4
```

## Codigos de tile (apos decodificar via tilesList)

| Codigo  | Significado                                    |
|---------|------------------------------------------------|
| $00     | Vazio (fora da fase)                           |
| $01-$09 | Bordas da arena (cantos, tops, sides)          |
| $0a-$0d | Grama cortada (4 variantes aleatorias)         |
| $0e-$11 | Grama alta (4 variantes - PRINCIPAL)           |
| $12     | Flores (intactas)                              |
| $13     | Flores cortadas                                |
| $14-$15 | Pedra (2 variantes)                            |
| $16-$2d | Tiles do HUD/textos (LEVEL, FUEL, !, etc)      |
| $2e-$2f | Galao de combustivel (animado)                 |

## Mapeamento 2-bit (formato compactado nos dados de fase)

```
2bit value 0  ->  $0a..$0d  (cut grass random)
2bit value 1  ->  $0e..$11  (tall grass random) <- alvo de corte
2bit value 2  ->  $12       (flowers)
2bit value 3  ->  $14       (stone)
```
