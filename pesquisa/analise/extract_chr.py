"""
Extrai patterns.chr (formato CHR-ROM do NES) em PNG.
Cada tile tem 8x8 pixels, 2 bits por pixel, ocupando 16 bytes.
"""
import sys
import os
from PIL import Image

PALETTE_GRAYSCALE = [
    (0, 0, 0),
    (85, 85, 85),
    (170, 170, 170),
    (255, 255, 255),
]

PALETTE_LAWN = [
    (0, 80, 0),
    (0, 168, 0),
    (120, 220, 120),
    (255, 255, 255),
]


def chr_to_image(chr_path, output_path, palette, tiles_per_row=16):
    with open(chr_path, 'rb') as f:
        data = f.read()

    if len(data) % 16 != 0:
        print(f"AVISO: {chr_path} tem {len(data)} bytes, nao e multiplo de 16")

    num_tiles = len(data) // 16
    rows = (num_tiles + tiles_per_row - 1) // tiles_per_row

    scale = 4
    img = Image.new('RGB', (tiles_per_row * 8 * scale, rows * 8 * scale))
    pixels = img.load()

    for tile_idx in range(num_tiles):
        tile_data = data[tile_idx * 16:(tile_idx + 1) * 16]
        plane0 = tile_data[:8]
        plane1 = tile_data[8:]

        tile_col = tile_idx % tiles_per_row
        tile_row = tile_idx // tiles_per_row

        for y in range(8):
            byte0 = plane0[y]
            byte1 = plane1[y]
            for x in range(8):
                bit0 = (byte0 >> (7 - x)) & 1
                bit1 = (byte1 >> (7 - x)) & 1
                color_idx = (bit1 << 1) | bit0
                color = palette[color_idx]
                px = (tile_col * 8 + x) * scale
                py = (tile_row * 8 + y) * scale
                for dy in range(scale):
                    for dx in range(scale):
                        pixels[px + dx, py + dy] = color

    img.save(output_path)
    print(f"OK: {output_path} - {num_tiles} tiles em grid {tiles_per_row}x{rows}")
    return num_tiles


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Uso: python extract_chr.py <caminho_para_patterns.chr>")
        sys.exit(1)

    chr_path = sys.argv[1]
    if not os.path.exists(chr_path):
        print(f"ERRO: {chr_path} nao existe")
        sys.exit(1)

    out_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(out_dir, 'assets-extraidos')
    os.makedirs(assets_dir, exist_ok=True)

    n1 = chr_to_image(chr_path, os.path.join(assets_dir, 'patterns_grayscale.png'), PALETTE_GRAYSCALE)
    n2 = chr_to_image(chr_path, os.path.join(assets_dir, 'patterns_lawn.png'), PALETTE_LAWN)

    print(f"\nResumo: {n1} tiles em 2 paletas")
