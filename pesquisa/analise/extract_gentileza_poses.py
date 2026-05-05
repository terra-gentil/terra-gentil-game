"""
Extrai as 12 poses do mascote Gentileza geradas pelo Andre via IA.

Input:  C:/Users/engan/Downloads/transferir (1).png  (731x411, checkerboard fake)
Output: pesquisa/analise/gentileza-poses/pose_NN.png  (cada pose recortada, alpha real)

Etapas:
1. Substitui cores cinza neutras (checkerboard) por alpha=0
2. Detecta gaps transparentes pra subdividir grid de poses
3. Recorta cada pose com bbox apertada
4. Salva PNGs individuais + indice visual com todas as poses lado a lado
"""
from PIL import Image
from pathlib import Path

SRC = Path(r'C:/Users/engan/Downloads/transferir (1).png')
OUT_DIR = Path(__file__).resolve().parent / 'gentileza-poses'
OUT_DIR.mkdir(exist_ok=True)

src = Image.open(SRC).convert('RGBA')
W, H = src.size
px = src.load()

# 1. Remove checkerboard (cinza neutro 130-210, R=G=B)
removed = 0
for y in range(H):
    for x in range(W):
        r, g, b, a = px[x, y]
        # Cinza neutro = R, G, B muito parecidos
        if abs(r - g) <= 5 and abs(g - b) <= 5 and abs(r - b) <= 5:
            avg = (r + g + b) // 3
            if 125 <= avg <= 215:
                px[x, y] = (0, 0, 0, 0)
                removed += 1
print(f'pixels removidos do checkerboard: {removed}')

# 2. Detecta gaps transparentes pra subdividir grid
def find_empty_lines(is_horizontal):
    """retorna lista de indices (col ou row) totalmente transparentes"""
    out = []
    if is_horizontal:
        for y in range(H):
            if all(src.getpixel((x, y))[3] == 0 for x in range(W)):
                out.append(y)
    else:
        for x in range(W):
            if all(src.getpixel((x, y))[3] == 0 for y in range(H)):
                out.append(x)
    return out

def runs(idxs):
    if not idxs: return []
    out = [(idxs[0], idxs[0])]
    for i in idxs[1:]:
        if i == out[-1][1] + 1:
            out[-1] = (out[-1][0], i)
        else:
            out.append((i, i))
    return out

def cells(gaps, total):
    if not gaps:
        return [(0, total - 1)]
    starts = [0] + [g[1] + 1 for g in gaps]
    ends = [g[0] - 1 for g in gaps] + [total - 1]
    return [(s, e) for s, e in zip(starts, ends) if e >= s]

empty_rows = find_empty_lines(True)
empty_cols = find_empty_lines(False)

row_gaps = runs(empty_rows)
col_gaps = runs(empty_cols)

# Ignora gaps muito pequenos (<3 px) que podem ser ruido
row_gaps = [g for g in row_gaps if g[1] - g[0] + 1 >= 3]
col_gaps = [g for g in col_gaps if g[1] - g[0] + 1 >= 3]

row_cells = cells(row_gaps, H)
col_cells = cells(col_gaps, W)

print(f'rows: {len(row_cells)} celulas: {row_cells}')
print(f'cols: {len(col_cells)} celulas: {col_cells}')

# 3. Recorta cada celula, salva com bbox apertada
# Filtra fragmentos de ruido (cells minusculas <30x30)
MIN_SPRITE_W, MIN_SPRITE_H = 30, 30
poses = []
idx = 1
for ry, (y0, y1) in enumerate(row_cells):
    for cx, (x0, x1) in enumerate(col_cells):
        cell = src.crop((x0, y0, x1 + 1, y1 + 1))
        bbox = cell.getbbox()
        if bbox is None:
            continue
        sprite = cell.crop(bbox)
        if sprite.size[0] < MIN_SPRITE_W or sprite.size[1] < MIN_SPRITE_H:
            continue  # fragmento de checkerboard residual
        poses.append((idx, ry, cx, sprite))
        # Limpa restos cinza dentro do sprite tambem
        spx = sprite.load()
        for sy in range(sprite.size[1]):
            for sx in range(sprite.size[0]):
                r, g, b, a = spx[sx, sy]
                if a > 0 and abs(r - g) <= 5 and abs(g - b) <= 5 and 125 <= (r+g+b)//3 <= 215:
                    spx[sx, sy] = (0, 0, 0, 0)
        sprite.save(OUT_DIR / f'pose_{idx:02d}.png')
        idx += 1

print(f'\n{len(poses)} poses extraidas em {OUT_DIR}')
for i, ry, cx, sp in poses:
    print(f'  pose_{i:02d}: row={ry} col={cx} size={sp.size}')

# 4. Indice visual: monta grid scaled 4x lado a lado
if poses:
    max_w = max(sp.size[0] for _, _, _, sp in poses)
    max_h = max(sp.size[1] for _, _, _, sp in poses)
    scale = 4
    cols = 6
    rows = (len(poses) + cols - 1) // cols
    pad = 8
    cw = max_w * scale + pad
    ch = max_h * scale + pad + 14  # +14 pra label
    grid = Image.new('RGBA', (cols * cw, rows * ch), (40, 40, 40, 255))
    for i, (idx, _, _, sp) in enumerate(poses):
        r = i // cols
        c = i % cols
        scaled = sp.resize((sp.size[0] * scale, sp.size[1] * scale), Image.NEAREST)
        x = c * cw + pad // 2 + (max_w * scale - scaled.size[0]) // 2
        y = r * ch + pad // 2 + (max_h * scale - scaled.size[1]) // 2
        grid.paste(scaled, (x, y), scaled)
    grid.save(OUT_DIR / '_index.png')
    print(f'\nIndice visual: {OUT_DIR / "_index.png"} ({grid.size})')
