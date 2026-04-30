"""
Extrai as 10 fases do Lawn Mower NES a partir de:
- editor/levels.bin (formato editor: 30x11x10 bytes + 10 params de 4 bytes)
- patterns.chr offset 4096 (formato runtime: 95 bytes/nivel, 88 packed + 7 metadata)

Mapeamento de tile codes (do editor):
  0 = grama cortada (decoracao, ja cortado)
  1 = grama alta (cuttable, conta pra terminar a fase)
  2 = flores (penalty: -GAME_FUEL_MAX/6 de combustivel)
  3 = pedra (penalty: -GAME_FUEL_MAX/3 + shake)
  4-7 = variantes / decorativos extras
"""
import os
import json
import struct

W = 30
H = 11
N_LEVELS = 10
TILE_LABEL = {
    0: 'grama_cortada',
    1: 'grama_alta',
    2: 'flores',
    3: 'pedra',
    4: 'extra_4',
    5: 'extra_5',
    6: 'extra_6',
    7: 'extra_7',
}


def parse_levels_bin(path):
    with open(path, 'rb') as f:
        raw = f.read()

    map_data = raw[:W * H * N_LEVELS]
    params_data = raw[W * H * N_LEVELS:]

    levels = []
    for i in range(N_LEVELS):
        params = struct.unpack_from('<I', params_data, i * 4)[0]
        width = params & 0xFF
        plr_x_raw = (params >> 8) & 0xFF
        plr_y_raw = (params >> 16) & 0xFF

        tiles = []
        for row in range(H):
            row_tiles = []
            for col in range(W):
                row_tiles.append(map_data[i * W * H + row * W + col])
            tiles.append(row_tiles)

        playable = [row[:width] for row in tiles]

        cut_target = sum(1 for row in playable for c in row if c == 1)

        levels.append({
            'id': i + 1,
            'largura_efetiva_tiles': width,
            'altura_tiles': H,
            'playable_tiles_total': width * H,
            'spawn_jogador': {
                'editor_x': plr_x_raw,
                'editor_y': plr_y_raw,
                'game_x': plr_x_raw + 1,
                'game_y': plr_y_raw + 3,
            },
            'grama_alta_para_cortar': cut_target,
            # int() trunca como o C++ original `(int)(100.0f*256.0f/tcnt)` em Unit1.cpp:471.
            # round() (usado anteriormente) resultava em diferenca de +1 em 6 das 10 fases.
            # Bug encontrado pelo QA G0 pass-01.
            'fuel_inc_por_tile_8_8': int(100 * 256 / cut_target) if cut_target else 0,
            'tiles_legenda': TILE_LABEL,
            'tiles': playable,
        })
    return levels


def parse_chr_levels(chr_path):
    with open(chr_path, 'rb') as f:
        chr_data = f.read()

    base = 4096
    levels = []
    for i in range(N_LEVELS):
        off = base + 95 * i
        packed = chr_data[off:off + 88]
        meta_width = chr_data[off + 88]
        meta_plr_x = chr_data[off + 89]
        meta_plr_y = chr_data[off + 90]
        meta_done_cnt = struct.unpack_from('<H', chr_data, off + 91)[0]
        meta_done_inc = struct.unpack_from('<H', chr_data, off + 93)[0]

        unpacked = []
        for byte in packed:
            unpacked.append((byte >> 6) & 3)
            unpacked.append((byte >> 4) & 3)
            unpacked.append((byte >> 2) & 3)
            unpacked.append(byte & 3)

        rows = []
        for r in range(H):
            row = unpacked[r * 32:r * 32 + 32]
            rows.append(row)

        levels.append({
            'id': i + 1,
            'meta_width': meta_width,
            'meta_player_x': meta_plr_x,
            'meta_player_y': meta_plr_y,
            'meta_done_cnt': meta_done_cnt,
            'meta_done_inc_8_8': meta_done_inc,
            'tiles_32x11_2bit': rows,
        })
    return levels


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    levels_bin = os.path.join(base, '..', 'lawn-mower-original', 'editor', 'levels.bin')
    patterns_chr = os.path.join(base, '..', 'lawn-mower-original', 'patterns.chr')

    out_dir = os.path.join(base, 'assets-extraidos')
    os.makedirs(out_dir, exist_ok=True)

    print('=== Lendo editor/levels.bin (formato fonte) ===')
    if os.path.exists(levels_bin):
        editor_levels = parse_levels_bin(levels_bin)
        with open(os.path.join(out_dir, 'fases_editor.json'), 'w', encoding='utf-8') as f:
            json.dump(editor_levels, f, indent=2, ensure_ascii=False)
        print(f'OK: {len(editor_levels)} fases salvas em fases_editor.json')

        with open(os.path.join(out_dir, 'fase_01.json'), 'w', encoding='utf-8') as f:
            json.dump(editor_levels[0], f, indent=2, ensure_ascii=False)
        print('OK: fase_01.json (formato editor) salva')

        for lvl in editor_levels:
            print(f"  Fase {lvl['id']:02d}: largura={lvl['largura_efetiva_tiles']}  "
                  f"spawn=({lvl['spawn_jogador']['game_x']},{lvl['spawn_jogador']['game_y']})  "
                  f"grama_alvo={lvl['grama_alta_para_cortar']}")
    else:
        print(f'AVISO: {levels_bin} nao encontrado')

    print('\n=== Lendo patterns.chr offset 4096 (formato runtime) ===')
    if os.path.exists(patterns_chr):
        chr_levels = parse_chr_levels(patterns_chr)
        with open(os.path.join(out_dir, 'fases_runtime.json'), 'w', encoding='utf-8') as f:
            json.dump(chr_levels, f, indent=2, ensure_ascii=False)
        print(f'OK: {len(chr_levels)} fases salvas em fases_runtime.json')
        for lvl in chr_levels:
            print(f"  Fase {lvl['id']:02d}: width={lvl['meta_width']:3d}  "
                  f"plr=({lvl['meta_player_x']},{lvl['meta_player_y']})  "
                  f"cnt={lvl['meta_done_cnt']:5d}  inc=0x{lvl['meta_done_inc_8_8']:04x}")
    else:
        print(f'AVISO: {patterns_chr} nao encontrado')
