"""
Monta spritesheet do mascote Gentileza a partir das 12 poses extraidas.

Layout:
- Cada frame: 64x90 px (aspect ~0.71 preservado do original 107x151)
- Spritesheet linear: 12 frames * 64 = 768 wide x 90 tall
- Frame index pra Phaser:

  0: idle_down       (pose_01 — frente parado)
  1: walk_down       (pose_02 — frente alternativo, alterna com 0)
  2: idle_up         (pose_03 — costas parado)
  3: walk_up         (pose_04 — costas com perna)
  4: idle_left       (pose_06 — perfil esquerdo parado)
  5: walk_left_a     (pose_11 — perfil esquerdo andando A)
  6: walk_left_b     (pose_12 — perfil esquerdo andando B)
  7: idle_right      (pose_05 — perfil direito parado)
  8: walk_right_a    (pose_07 — perfil direito andando A)
  9: walk_right_b    (pose_08 — perfil direito andando B)
 10: walk_right_c    (pose_09 — perfil direito andando C)
 11: walk_right_d    (pose_10 — perfil direito andando D)

Output: jogo/public/assets/sprites/gentileza.png  (768x90)
"""
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
POSES_DIR = ROOT / 'pesquisa' / 'analise' / 'gentileza-poses'
OUT = ROOT / 'jogo' / 'public' / 'assets' / 'sprites' / 'gentileza.png'

FRAME_W, FRAME_H = 64, 90

# Mapeamento (frame_index, pose_filename)
FRAMES = [
    (0,  'pose_01.png'),  # idle_down
    (1,  'pose_02.png'),  # walk_down
    (2,  'pose_03.png'),  # idle_up
    (3,  'pose_04.png'),  # walk_up
    (4,  'pose_06.png'),  # idle_left
    (5,  'pose_11.png'),  # walk_left_a
    (6,  'pose_12.png'),  # walk_left_b
    (7,  'pose_05.png'),  # idle_right
    (8,  'pose_07.png'),  # walk_right_a
    (9,  'pose_08.png'),  # walk_right_b
    (10, 'pose_09.png'),  # walk_right_c
    (11, 'pose_10.png'),  # walk_right_d
]

sheet = Image.new('RGBA', (FRAME_W * len(FRAMES), FRAME_H), (0, 0, 0, 0))

for idx, fname in FRAMES:
    pose = Image.open(POSES_DIR / fname).convert('RGBA')
    # Downscale preservando aspect ratio (LANCZOS pra qualidade)
    pose.thumbnail((FRAME_W, FRAME_H), Image.LANCZOS)
    # Centraliza horizontalmente, alinha baseline embaixo
    paste_x = idx * FRAME_W + (FRAME_W - pose.size[0]) // 2
    paste_y = FRAME_H - pose.size[1]  # alinha pes ao fundo do frame
    sheet.paste(pose, (paste_x, paste_y), pose)

OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT)
print(f'Saved spritesheet: {OUT} ({sheet.size})')

# Preview com grid + labels
from PIL import ImageDraw, ImageFont
preview = sheet.resize((sheet.size[0] * 3, sheet.size[1] * 3), Image.NEAREST)
preview_bg = Image.new('RGBA', (preview.size[0], preview.size[1] + 40), (35, 35, 35, 255))
preview_bg.paste(preview, (0, 0), preview)
draw = ImageDraw.Draw(preview_bg)
try:
    font = ImageFont.truetype("arial.ttf", 16)
except Exception:
    font = ImageFont.load_default()
labels = ['idle_d', 'walk_d', 'idle_u', 'walk_u', 'idle_l', 'walk_la', 'walk_lb',
          'idle_r', 'walk_ra', 'walk_rb', 'walk_rc', 'walk_rd']
for i, lbl in enumerate(labels):
    x = i * FRAME_W * 3 + (FRAME_W * 3) // 2
    bbox = draw.textbbox((0, 0), lbl, font=font)
    draw.text((x - (bbox[2]-bbox[0])//2, sheet.size[1] * 3 + 10), lbl, fill='white', font=font)
preview_bg.save(OUT.parent / 'gentileza_3x.png')
print(f'Preview: {OUT.parent / "gentileza_3x.png"}')
