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
