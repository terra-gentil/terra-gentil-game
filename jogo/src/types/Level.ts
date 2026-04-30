export type TileType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const TILE = {
  CUT: 0,
  TALL: 1,
  FLOWERS: 2,
  STONE: 3,
} as const;

export type AllLevelsJson = LevelJson[];

export interface LevelJson {
  id: number;
  largura_efetiva_tiles: number;
  altura_tiles: number;
  playable_tiles_total: number;
  spawn_jogador: {
    editor_x: number;
    editor_y: number;
    game_x: number;
    game_y: number;
  };
  grama_alta_para_cortar: number;
  fuel_inc_por_tile_8_8: number;
  tiles_legenda: Record<string, string>;
  tiles: number[][];
}
