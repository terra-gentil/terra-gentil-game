import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { TitleScene } from '../scenes/TitleScene';
import { GameScene } from '../scenes/GameScene';
import { RankingScene } from '../scenes/RankingScene';
import { GAME_WIDTH, GAME_HEIGHT } from './Constants';

// Re-export pra compat com imports legados de '../config/GameConfig'.
// Novos arquivos devem importar de '../config/Constants' direto.
export { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, COLORS, RANKING_API_URL } from './Constants';

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1B5E20',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, TitleScene, GameScene, RankingScene],
  pixelArt: true,
  roundPixels: true,
  input: {
    activePointers: 3,
  },
};
