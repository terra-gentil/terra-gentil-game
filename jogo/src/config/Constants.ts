// Constantes globais do jogo. Arquivo isolado (sem imports de scenes) pra evitar
// dependencia circular: GameConfig.ts importa as scenes, que por sua vez precisam
// destas constantes. Se as scenes importassem de GameConfig.ts, o ciclo fecharia.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const TILE_SIZE = 64;

export const COLORS = {
  GRASS_TALL: 0x1B5E20,
  GRASS_CUT: 0x66BB6A,
  GENTILEZA_YELLOW: 0xF5C97E,
  GENTILEZA_LEAF: 0x4FBA53,
  MOWER_ORANGE: 0xE8631E,
  HUD_BLUE: 0x3A7BD5,
  WHITE: 0xFFFFFF,
  BLACK: 0x000000,
};

export const RANKING_API_URL = 'https://terra-gentil-game-production.up.railway.app';

// G6.5: quando os SFX OGG forem exportados via FamiStudio e dropados em
// jogo/public/assets/audio/{cut,flowers,stone,fuel,clear,gameover}.ogg,
// vire esta flag pra true. SfxPlayer passa a usar Phaser.Sound em vez do
// synth via Web Audio. Default false: mantem synth atual sem dependencia
// de assets.
export const USE_OGG_SFX = false;

export const SFX_KEYS = {
  cut: 'sfx_cut',
  penaltyFlowers: 'sfx_flowers',
  penaltyStone: 'sfx_stone',
  fuelPickup: 'sfx_fuel',
  levelClear: 'sfx_clear',
  gameOver: 'sfx_gameover',
} as const;

export const SFX_PATHS: Record<keyof typeof SFX_KEYS, string> = {
  cut: 'assets/audio/cut.ogg',
  penaltyFlowers: 'assets/audio/flowers.ogg',
  penaltyStone: 'assets/audio/stone.ogg',
  fuelPickup: 'assets/audio/fuel.ogg',
  levelClear: 'assets/audio/clear.ogg',
  gameOver: 'assets/audio/gameover.ogg',
};
