# Pasta editor/ - Editor de fases do Shiru

## Conteudo

```
editor/
  editor.exe        469504B  - executavel Windows (Borland C++ Builder)
  levels.bin          3340B  - dados das 10 fases (formato fonte)
  patterns.chr        8192B  - copia do CHR usada pelo editor
  src/
    Project1.cpp        814B - main do programa
    Project1.bdsproj  17143B - projeto Borland Developer Studio
    Project1.bdsproj.local 808B
    Project1.res       4396B - recursos Win32
    Unit1.cpp         9698B - logica do editor (form principal)
    Unit1.h           1773B - header
    Unit1.dfm       115789B - form Delphi (UI)
    tileset.bmp       12342B - tileset visual usado no PaintBox
```

## Hipotese confirmada

A pasta `editor/` contem o source de um editor de fases que:

1. Le e escreve `levels.bin` no formato fonte (mapas 30x11 + params)
2. Reempacota os mapas em formato compactado e escreve em `patterns.chr` offset 4096
3. Permite rotacionar mapas (setas), trocar nivel (PgUp/PgDn), ajustar largura (Home/End)

## Formato de levels.bin (CONFIRMADO via Unit1.cpp)

```c
const int width  = 30;   // largura maxima em tiles
const int height = 11;   // altura fixa
const int levels = 10;

unsigned char map[30 * 11 * 10];   // 3300 bytes
unsigned int params[10];           // 40 bytes (uint32 LE por nivel)

// Total: 3340 bytes (BATE com tamanho real do arquivo)
```

### Layout do array `map`

```
map[level * (W*H) + row * W + col]   // W=30, H=11
                                     // level 0..9, row 0..10, col 0..29
```

Cada byte do `map` e o codigo de tile do editor (0..7), tipicamente:

```
0 = grama cortada (decoracao)
1 = grama alta (alvo de corte, conta pra terminar)
2 = flores (penalty fuel)
3 = pedra (penalty fuel + shake)
4-7 = variantes (extras na paleta do editor)
```

### Layout dos `params`

Cada `params[i]` e um uint32 little-endian com 3 bytes uteis:

```
byte 0 (bits 0..7)  : largura efetiva do nivel (14..30)
byte 1 (bits 8..15) : posicao X inicial do jogador no editor (0-based, sem borda)
byte 2 (bits 16..23): posicao Y inicial do jogador no editor (0-based)
byte 3              : nao usado / reservado
```

## Formato de fase no patterns.chr (gerado por FormDestroy)

A funcao `FormDestroy()` reempacota tudo em 95 bytes/fase no offset 4096 do CHR:

```
Por fase (95 bytes total):
  88 bytes : packed 2-bit (4 cells/byte, LE-bits-MSB-first)
              decodificacao: shift right por 6, 4, 2, 0; mask 3
              Iteracao: 32 colunas x 11 linhas (col 0 = borda, sempre 0)
  +1 byte  : largura efetiva (params[i] & 0xFF)
  +1 byte  : player_x = (params[i] >> 8 & 0xFF) + 1   (offset por borda)
  +1 byte  : player_y = (params[i] >> 16 & 0xFF) + 3  (offset por bordas top)
  +2 bytes : tcnt LE   (qtd de tiles tipo 1 = grama alta a cortar)
  +2 bytes : inc LE    (incremento de % por corte = round(100*256/tcnt))
```

10 fases * 95 bytes = 950 bytes a partir de patterns.chr offset 4096.

## Mapas das 10 fases (extraidos)

| Fase | Largura | Spawn (game) | Grama alvo | Inc 8:8 |
|------|---------|--------------|------------|---------|
| 01   | 14      | (7, 8)       | 96         | 0x010A  |
| 02   | 14      | (7, 8)       | 116        | 0x00DC  |
| 03   | 14      | (7, 8)       | 122        | 0x00D1  |
| 04   | 20      | (6, 8)       | 183        | 0x008B  |
| 05   | 20      | (3, 8)       | 173        | 0x0093  |
| 06   | 25      | (13, 8)      | 247        | 0x0067  |
| 07   | 25      | (3, 8)       | 190        | 0x0086  |
| 08   | 25      | (3, 8)       | 221        | 0x0073  |
| 09   | 30      | (15, 8)      | 247        | 0x0067  |
| 10   | 30      | (15, 8)      | 248        | 0x0067  |

**Spawn (game)** ja inclui o offset (+1 X, +3 Y) que o editor aplica antes de gravar.

A altura fixa e sempre 11 tiles. Largura cresce ao longo das fases (14 -> 30), o que confirma que o scroll horizontal so e necessario a partir da fase 4 (largura 20 > tela visivel de 14 tiles).

## Controles do editor (deduzidos do Unit1.cpp)

```
Mouse esquerdo            : pinta tile selecionado
Shift+esquerdo            : marca posicao do jogador
Mouse direito             : seleciona tile do mapa como ativo
PaintBoxPal click         : seleciona tile (0..7) na paleta
Numpad +/-                : muda nivel
Setas L/R                 : rotaciona mapa horizontalmente
Setas U/D                 : rotaciona mapa verticalmente
PgUp/PgDn                 : troca nivel atual com adjacente
Home/End                  : decrementa/incrementa largura efetiva
```

## Implicacao para o port em JS

Como temos tanto o `levels.bin` (formato fonte, mais limpo) quanto o packed no CHR, podemos:

1. **Importar diretamente as 10 fases** convertidas em JSON (ja em `assets-extraidos/fases_editor.json`)
2. Usar a mesma logica de spawn (player_x+1, player_y+3) ou ajustar pro novo sistema de bordas
3. Manter as proporcoes 14/20/25/30 ou refazer pra resolucoes maiores
