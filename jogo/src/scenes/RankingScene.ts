import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { getTopScores, RankingApiError } from '../api/RankingApi';
import type { ScoreOut } from '../types/Ranking';
import { sfx } from '../audio/SfxPlayer';
import { getSettings } from '../config/Settings';

export class RankingScene extends Phaser.Scene {
  private listContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private retryBtn?: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RankingScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0E3211');
    sfx.setMuted(!getSettings().soundEnabled);

    this.add.text(GAME_WIDTH / 2, 60, 'RANKING - TOP 50', {
      fontFamily: 'Arial Black',
      fontSize: '56px',
      color: '#F5C97E',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    const backBtn = this.add.text(80, 60, '< VOLTAR', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#FFFFFF',
      backgroundColor: '#37474F',
      padding: { x: 20, y: 12 },
    });
    backBtn.setOrigin(0, 0.5);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('TitleScene'));
    backBtn.on('pointerover', () => backBtn.setBackgroundColor('#558B2F'));
    backBtn.on('pointerout', () => backBtn.setBackgroundColor('#37474F'));

    const kb = this.input.keyboard!;
    const onEsc = () => this.scene.start('TitleScene');
    kb.on('keydown-ESC', onEsc);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off('keydown-ESC', onEsc);
    });

    this.listContainer = this.add.container(0, 0);
    this.statusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'CARREGANDO...', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    void this.loadAndRender();
  }

  private async loadAndRender(): Promise<void> {
    this.statusText.setText('CARREGANDO...');
    this.statusText.setVisible(true);
    this.retryBtn?.destroy();
    this.retryBtn = undefined;
    this.listContainer.removeAll(true);

    try {
      const data = await getTopScores(50);
      this.statusText.setVisible(false);
      if (data.scores.length === 0) {
        this.statusText.setText('NENHUM SCORE AINDA.\nSEJA O PRIMEIRO!');
        this.statusText.setVisible(true);
        return;
      }
      this.renderList(data.scores);
    } catch (e) {
      const msg = e instanceof RankingApiError ? e.message : 'Erro ao carregar';
      this.statusText.setText(msg);
      this.statusText.setColor('#FF7043');
      this.retryBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, 'TENTAR DE NOVO', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#FFFFFF',
        backgroundColor: '#3A7BD5',
        padding: { x: 30, y: 16 },
      });
      this.retryBtn.setOrigin(0.5).setInteractive({ useHandCursor: true });
      this.retryBtn.on('pointerdown', () => {
        this.statusText.setColor('#FFFFFF');
        void this.loadAndRender();
      });
    }
  }

  private renderList(scores: ScoreOut[]): void {
    const colHeaders = ['#', 'APELIDO', 'FASE', '%', 'TEMPO'];
    const colX = [120, 280, 720, 880, 1040];
    const rowH = 40;
    const startY = 140;

    const headerStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#F5C97E',
    };
    colHeaders.forEach((h, i) => {
      this.listContainer.add(
        this.add.text(colX[i], startY, h, headerStyle).setOrigin(0, 0.5)
      );
    });

    const cellStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#FFFFFF',
    };
    const topStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial Black',
      fontSize: '22px',
      color: '#F5C97E',
    };

    const visibleRows = Math.min(scores.length, 13);
    for (let i = 0; i < visibleRows; i++) {
      const s = scores[i];
      const y = startY + 40 + i * rowH;
      const style = i < 3 ? topStyle : cellStyle;
      const cells = [
        String(i + 1),
        s.nickname,
        String(s.level_reached),
        `${s.total_pct}%`,
        formatTime(s.time_seconds),
      ];
      cells.forEach((c, idx) => {
        this.listContainer.add(
          this.add.text(colX[idx], y, c, style).setOrigin(0, 0.5)
        );
      });
    }

    if (scores.length > visibleRows) {
      this.listContainer.add(
        this.add.text(
          GAME_WIDTH / 2,
          startY + 40 + visibleRows * rowH + 20,
          `+ ${scores.length - visibleRows} mais...`,
          { fontFamily: 'Arial', fontSize: '18px', color: '#AAAAAA' }
        ).setOrigin(0.5)
      );
    }
  }
}

function formatTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, '0')}`;
}
