import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/Constants';
import { getSettings, toggleEyeStrainMode, toggleSound } from '../config/Settings';
import { sfx } from '../audio/SfxPlayer';
import { startRun } from '../state/RunStats';

export class TitleScene extends Phaser.Scene {
  private eyeStrainButton!: Phaser.GameObjects.Text;
  private soundButton!: Phaser.GameObjects.Text;
  // P2-G8-06: bloqueia clique duplo em JOGAR/selectors/RANKING durante a
  // transicao pra outra scene. Phaser scene.start e idempotente, mas
  // disparamos sfx.prime() e startRun em sequencia — clique duplo causaria
  // resets duplos de stats sem necessidade.
  private transitioning = false;

  constructor() {
    super({ key: 'TitleScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1B5E20');
    this.transitioning = false;

    // Sincroniza muted do sfx player com o setting persistido
    sfx.setMuted(!getSettings().soundEnabled);

    // Background da title screen — imagem com logo "GENTILEZA Resgate dos
    // Jardins" + arte de jardim. Logo ja vem desenhada na imagem, por isso
    // nao adicionamos os textos GENTILEZA/Resgate como text objects.
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'title_bg');
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(0);

    const startButton = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, 'JOGAR DESDE A FASE 1', {
      fontFamily: 'Arial',
      fontSize: '40px',
      color: '#FFFFFF',
      backgroundColor: '#3A7BD5',
      padding: { x: 40, y: 20 },
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: startButton,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    startButton.on('pointerdown', () => {
      if (this.transitioning) return;
      this.transitioning = true;
      // prime() garante que AudioContext seja criado dentro deste user gesture
      // pra que o primeiro SFX no GameScene nao seja silenciado em mobile Safari
      sfx.prime();
      startRun({ practiceMode: false, startLevelIndex: 0 });
      this.scene.start('GameScene', { levelIndex: 0 });
    });

    // Toggle de modo olhos cansados
    this.eyeStrainButton = this.add.text(GAME_WIDTH / 2 - 200, GAME_HEIGHT / 2 + 110, '', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: '#37474F',
      padding: { x: 20, y: 12 },
    });
    this.eyeStrainButton.setOrigin(0.5);
    this.eyeStrainButton.setInteractive({ useHandCursor: true });
    this.eyeStrainButton.on('pointerdown', () => {
      const updated = toggleEyeStrainMode();
      this.refreshEyeStrainLabel(updated.eyeStrainMode);
    });
    this.refreshEyeStrainLabel(getSettings().eyeStrainMode);

    // Toggle de som
    this.soundButton = this.add.text(GAME_WIDTH / 2 + 200, GAME_HEIGHT / 2 + 110, '', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFFFFF',
      backgroundColor: '#37474F',
      padding: { x: 20, y: 12 },
    });
    this.soundButton.setOrigin(0.5);
    this.soundButton.setInteractive({ useHandCursor: true });
    this.soundButton.on('pointerdown', () => {
      const updated = toggleSound();
      sfx.setMuted(!updated.soundEnabled);
      this.refreshSoundLabel(updated.soundEnabled);
      // Feedback imediato: tom curto se ligando, silencio se desligando
      if (updated.soundEnabled) sfx.fuelPickup();
    });
    this.refreshSoundLabel(getSettings().soundEnabled);

    // Selector de fase pra teste rapido (1-10)
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 200, 'OU PULE PRA UMA FASE:', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0.8);

    const startX = GAME_WIDTH / 2 - 5 * 80;
    for (let i = 0; i < 10; i++) {
      const btn = this.add.text(startX + i * 80 + 40, GAME_HEIGHT - 140, String(i + 1), {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#FFFFFF',
        backgroundColor: '#1B5E20',
        padding: { x: 16, y: 12 },
      });
      btn.setOrigin(0.5);
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setBackgroundColor('#2E7D32'));
      btn.on('pointerout', () => btn.setBackgroundColor('#1B5E20'));
      btn.on('pointerdown', () => {
        if (this.transitioning) return;
        this.transitioning = true;
        sfx.prime();
        // Selector e modo pratica: nao oferece submit pro ranking
        startRun({ practiceMode: true, startLevelIndex: i });
        this.scene.start('GameScene', { levelIndex: i });
      });
    }

    // Botao RANKING (canto superior direito)
    const rankingBtn = this.add.text(GAME_WIDTH - 40, 60, 'RANKING', {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: '#FFFFFF',
      backgroundColor: '#3A7BD5',
      padding: { x: 20, y: 12 },
    });
    rankingBtn.setOrigin(1, 0.5);
    rankingBtn.setInteractive({ useHandCursor: true });
    rankingBtn.on('pointerover', () => rankingBtn.setBackgroundColor('#558B2F'));
    rankingBtn.on('pointerout', () => rankingBtn.setBackgroundColor('#3A7BD5'));
    rankingBtn.on('pointerdown', () => {
      if (this.transitioning) return;
      this.transitioning = true;
      sfx.prime();
      this.scene.start('RankingScene');
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Gentileza é marca registrada de Terra Gentil', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFFFFF',
    }).setOrigin(0.5).setAlpha(0.6);

    console.log('TitleScene: inicializada');
  }

  private refreshEyeStrainLabel(active: boolean): void {
    this.eyeStrainButton.setText(`OLHOS CANSADOS: ${active ? 'LIGADO' : 'DESLIGADO'}`);
    this.eyeStrainButton.setBackgroundColor(active ? '#558B2F' : '#37474F');
  }

  private refreshSoundLabel(active: boolean): void {
    this.soundButton.setText(`SOM: ${active ? 'LIGADO' : 'DESLIGADO'}`);
    this.soundButton.setBackgroundColor(active ? '#558B2F' : '#37474F');
  }
}
