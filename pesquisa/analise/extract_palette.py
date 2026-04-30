"""
Le palette.asm e converte indices NES em valores RGB hex.
Extrai apenas as paletas nomeadas (palTitle, palGameSprites, palGame, palDone),
ignorando a tabela de brilho (palBrightTable) que nao e uma paleta.
"""
import re
import os
import json

NES_PALETTE = [
    (0x7C, 0x7C, 0x7C), (0x00, 0x00, 0xFC), (0x00, 0x00, 0xBC), (0x44, 0x28, 0xBC),
    (0x94, 0x00, 0x84), (0xA8, 0x00, 0x20), (0xA8, 0x10, 0x00), (0x88, 0x14, 0x00),
    (0x50, 0x30, 0x00), (0x00, 0x78, 0x00), (0x00, 0x68, 0x00), (0x00, 0x58, 0x00),
    (0x00, 0x40, 0x58), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00),
    (0xBC, 0xBC, 0xBC), (0x00, 0x78, 0xF8), (0x00, 0x58, 0xF8), (0x68, 0x44, 0xFC),
    (0xD8, 0x00, 0xCC), (0xE4, 0x00, 0x58), (0xF8, 0x38, 0x00), (0xE4, 0x5C, 0x10),
    (0xAC, 0x7C, 0x00), (0x00, 0xB8, 0x00), (0x00, 0xA8, 0x00), (0x00, 0xA8, 0x44),
    (0x00, 0x88, 0x88), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00),
    (0xF8, 0xF8, 0xF8), (0x3C, 0xBC, 0xFC), (0x68, 0x88, 0xFC), (0x98, 0x78, 0xF8),
    (0xF8, 0x78, 0xF8), (0xF8, 0x58, 0x98), (0xF8, 0x78, 0x58), (0xFC, 0xA0, 0x44),
    (0xF8, 0xB8, 0x00), (0xB8, 0xF8, 0x18), (0x58, 0xD8, 0x54), (0x58, 0xF8, 0x98),
    (0x00, 0xE8, 0xD8), (0x78, 0x78, 0x78), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00),
    (0xFC, 0xFC, 0xFC), (0xA4, 0xE4, 0xFC), (0xB8, 0xB8, 0xF8), (0xD8, 0xB8, 0xF8),
    (0xF8, 0xB8, 0xF8), (0xF8, 0xA4, 0xC0), (0xF0, 0xD0, 0xB0), (0xFC, 0xE0, 0xA8),
    (0xF8, 0xD8, 0x78), (0xD8, 0xF8, 0x78), (0xB8, 0xF8, 0xB8), (0xB8, 0xF8, 0xD8),
    (0x00, 0xFC, 0xFC), (0xF8, 0xD8, 0xF8), (0x00, 0x00, 0x00), (0x00, 0x00, 0x00),
]

NAMED_PALETTES = ['palTitle', 'palGameSprites', 'palGame', 'palDone']


def parse_named_palette(content, label):
    """Pega o bloco de bytes logo apos o label."""
    pattern = rf'^{re.escape(label)}\s*\n\s*\.byte\s+([\$\w\s,]+)'
    m = re.search(pattern, content, re.MULTILINE)
    if not m:
        return []
    bytes_out = []
    for token in m.group(1).split(','):
        token = token.strip()
        if token.startswith('$'):
            try:
                bytes_out.append(int(token[1:], 16))
            except ValueError:
                pass
    return bytes_out


def to_hex(rgb):
    return f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"


def parse_pal_list_from_game(game_dasm_path):
    """Extrai palList do game.dasm: 10 paletas (3 cores cada)."""
    with open(game_dasm_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    m = re.search(r'^palList\s*\n((?:\s*\.byte[^\n]*\n)+)', content, re.MULTILINE)
    if not m:
        return []

    block = m.group(1)
    triples = []
    for line in block.splitlines():
        line_clean = line.split(';')[0].strip()
        if not line_clean.startswith('.byte'):
            continue
        comment = ''
        if ';' in line:
            comment = line.split(';', 1)[1].strip()
        body = line_clean[len('.byte'):].strip()
        bytes_in_line = []
        for tok in body.split(','):
            tok = tok.strip()
            if tok.startswith('$'):
                try:
                    bytes_in_line.append(int(tok[1:], 16))
                except ValueError:
                    pass
        if len(bytes_in_line) == 3:
            triples.append({
                'indices': [f"${b:02X}" for b in bytes_in_line],
                'rgb': [to_hex(NES_PALETTE[b]) if b < 64 else to_hex((0, 0, 0)) for b in bytes_in_line],
                'descricao': comment,
            })
    return triples


def palette_to_4colors(byte_list):
    """16 bytes = 4 sub-paletas de 4 cores."""
    sub = []
    for i in range(0, len(byte_list), 4):
        chunk = byte_list[i:i + 4]
        if len(chunk) < 4:
            break
        sub.append({
            'indices': [f"${b:02X}" for b in chunk],
            'rgb': [to_hex(NES_PALETTE[b]) if b < 64 else to_hex((0, 0, 0)) for b in chunk],
        })
    return sub


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    palette_asm = os.path.join(base, '..', 'lawn-mower-original', 'palette.asm')
    game_dasm = os.path.join(base, '..', 'lawn-mower-original', 'game.dasm')

    if not os.path.exists(palette_asm):
        print(f"ERRO: nao achei {palette_asm}")
        exit(1)

    with open(palette_asm, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    out = {'paletas_nomeadas': {}, 'palList_por_nivel': []}

    for label in NAMED_PALETTES:
        b = parse_named_palette(content, label)
        out['paletas_nomeadas'][label] = {
            'total_bytes': len(b),
            'sub_paletas': palette_to_4colors(b),
        }
        print(f"\n{label} ({len(b)} bytes):")
        for i, sp in enumerate(out['paletas_nomeadas'][label]['sub_paletas']):
            print(f"  Sub {i}: {sp['rgb']} (NES {sp['indices']})")

    out['palList_por_nivel'] = parse_pal_list_from_game(game_dasm)
    print(f"\npalList ({len(out['palList_por_nivel'])} cores variantes por nivel):")
    for i, t in enumerate(out['palList_por_nivel']):
        print(f"  Nivel {i+1:02d}: {t['rgb']} ({t['descricao']})")

    out_path = os.path.join(base, 'assets-extraidos', 'palettes.json')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f"\nOK: salvou {out_path}")
