"""
Extrai 4 tiles + fuel_barrel do PNG composto que Andre gerou via IA.
Ignora a pose extra do Gentileza embutida.

Input:  C:/Users/engan/Downloads/transferir (2).png
Output: jogo/public/assets/tiles/{tile_cut,tile_tall,tile_flowers,tile_stone}.png  (64x64)
        jogo/public/assets/sprites/fuel_barrel.png  (64x64)

Algoritmo:
1. Flood-fill a partir dos cantos pra remover background branco/cinza claro.
2. Connected components labeling em pixels opacos (4-neighbors).
3. Filtra componentes pequenos (< 4000 pixels = labels de texto, ruido).
4. Ordena componentes por (cy, cx) — top-left first, raster order.
5. Mapping manual posicao -> arquivo.
"""
from PIL import Image
from pathlib import Path
from collections import deque

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(r'C:/Users/engan/Downloads/transferir (2).png')
TILES_OUT = ROOT / 'jogo' / 'public' / 'assets' / 'tiles'
SPRITES_OUT = ROOT / 'jogo' / 'public' / 'assets' / 'sprites'
RAW_OUT = ROOT / 'pesquisa' / 'analise' / 'tiles-raw'

src = Image.open(SRC).convert('RGBA')
W, H = src.size
print(f'source: {W}x{H}')
px = src.load()


def is_bg(c):
    r, g, b, a = c
    if a == 0:
        return True
    if abs(r - g) <= 8 and abs(g - b) <= 8 and abs(r - b) <= 8:
        return (r + g + b) // 3 >= 180
    return False


# 1. Flood-fill bg dos 4 cantos
visited = [[False] * W for _ in range(H)]
q = deque()
for (sx, sy) in [(0, 0), (W-1, 0), (0, H-1), (W-1, H-1)]:
    if is_bg(px[sx, sy]):
        q.append((sx, sy))
        visited[sy][sx] = True
while q:
    x, y = q.popleft()
    px[x, y] = (0, 0, 0, 0)
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        nx, ny = x + dx, y + dy
        if 0 <= nx < W and 0 <= ny < H and not visited[ny][nx]:
            if is_bg(px[nx, ny]):
                visited[ny][nx] = True
                q.append((nx, ny))
print('background flood-fill OK')


# 2. Connected components em pixels opacos (4-neighbors)
labels = [[0] * W for _ in range(H)]
comps = []  # list de (size, bbox)
next_label = 1
for y0 in range(H):
    for x0 in range(W):
        if labels[y0][x0] != 0:
            continue
        if px[x0, y0][3] == 0:
            continue
        # BFS
        size = 0
        minx = maxx = x0
        miny = maxy = y0
        bq = deque([(x0, y0)])
        labels[y0][x0] = next_label
        while bq:
            x, y = bq.popleft()
            size += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < W and 0 <= ny < H:
                    if labels[ny][nx] == 0 and px[nx, ny][3] != 0:
                        labels[ny][nx] = next_label
                        bq.append((nx, ny))
        comps.append({'label': next_label, 'size': size, 'bbox': (minx, miny, maxx, maxy)})
        next_label += 1

print(f'connected components total: {len(comps)}')

# 3. Filter por tamanho (>= 4000 pixels = arte)
big = [c for c in comps if c['size'] >= 4000]
print(f'componentes grandes (>= 4000 px): {len(big)}')
for c in big:
    bx0, by0, bx1, by1 = c['bbox']
    print(f'  size={c["size"]:6d} bbox=({bx0},{by0})-({bx1},{by1}) wh={bx1-bx0+1}x{by1-by0+1}')

# 4. Ordena raster: linha primeiro (y center), depois col (x center)
# Define "linha" como buckets Y agrupados por proximidade
big.sort(key=lambda c: ((c['bbox'][1] + c['bbox'][3]) // 2, (c['bbox'][0] + c['bbox'][2]) // 2))

# Agrupa em rows: 2 componentes na mesma row se cy diff < 100
rows = []
for c in big:
    cy = (c['bbox'][1] + c['bbox'][3]) // 2
    placed = False
    for r in rows:
        if abs(cy - r['cy']) < 100:
            r['items'].append(c)
            r['cy'] = (r['cy'] * (len(r['items']) - 1) + cy) // len(r['items'])
            placed = True
            break
    if not placed:
        rows.append({'cy': cy, 'items': [c]})

# Sort items dentro de cada row por X
for r in rows:
    r['items'].sort(key=lambda c: (c['bbox'][0] + c['bbox'][2]) // 2)

# Print final layout
print('\nlayout detectado:')
for ri, r in enumerate(rows):
    print(f'  row {ri} (cy~{r["cy"]}):')
    for ci, c in enumerate(r['items']):
        bx0, by0, bx1, by1 = c['bbox']
        print(f'    col {ci}: bbox=({bx0},{by0})-({bx1},{by1})')

# 5. Mapping (row, col) -> output
# Esperado:
#   row 0: tile_cut, tile_tall, gentileza_extra
#   row 1: tile_flowers, tile_stone, fuel_barrel
mapping = {
    (0, 0): ('tiles', 'tile_cut.png'),
    (0, 1): ('tiles', 'tile_tall.png'),
    (0, 2): None,  # gentileza extra
    (1, 0): ('tiles', 'tile_flowers.png'),
    (1, 1): ('tiles', 'tile_stone.png'),
    (1, 2): ('sprites', 'fuel_barrel.png'),
}

TILES_OUT.mkdir(parents=True, exist_ok=True)
SPRITES_OUT.mkdir(parents=True, exist_ok=True)
RAW_OUT.mkdir(parents=True, exist_ok=True)

for ri, r in enumerate(rows):
    for ci, c in enumerate(r['items']):
        target = mapping.get((ri, ci))
        if target is None:
            print(f'r{ri}c{ci}: pulando')
            continue
        folder, fname = target
        out_dir = TILES_OUT if folder == 'tiles' else SPRITES_OUT

        # Crop ao bbox do componente
        bx0, by0, bx1, by1 = c['bbox']
        crop = src.crop((bx0, by0, bx1 + 1, by1 + 1))

        # Pra tiles, corta 12 px de cada lado pra remover a borda escura
        # do "card" que o gerador IA adiciona (ficava visivel como linha
        # preta entre tiles no grid). Sprites (fuel_barrel) mantem inteiro.
        if folder == 'tiles':
            margin = 12
            cw, ch = crop.size
            if cw > 2 * margin and ch > 2 * margin:
                crop = crop.crop((margin, margin, cw - margin, ch - margin))

        # Salva versao raw
        crop.save(RAW_OUT / f'raw_{fname}')

        # Downscale pra 64x64
        final = crop.resize((64, 64), Image.LANCZOS)
        final.save(out_dir / fname)
        print(f'r{ri}c{ci} -> {out_dir / fname} (raw {crop.size} -> 64x64)')

print('\nDone.')
