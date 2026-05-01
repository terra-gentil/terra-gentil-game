# SFX - Como ativar OGGs reais (G6.5)

Hoje o jogo usa SFX sintetizado via Web Audio (G6, sem assets). Pra trocar pelos
OGGs reais exportados dos `.ftm` originais do Lawn Mower NES via FamiStudio:

## Passos

1. Instalar FamiStudio: https://famistudio.org
2. Abrir `pesquisa/lawn-mower-original/sound/sounds.ftm` (ou `lawn_mower.ftm`)
3. Exportar cada SFX do brief abaixo em OGG e dropar nesta pasta com o nome exato:
   - `cut.ogg` - corte de grama (curto, ~50ms)
   - `flowers.ogg` - pisar em flores
   - `stone.ogg` - bater em pedra (thump grave)
   - `fuel.ogg` - pegar galao (ascendente alegre)
   - `clear.ogg` - fase completa
   - `gameover.ogg` - fim de jogo (descendente)
4. Editar `jogo/src/config/Constants.ts`:
   - Mudar `USE_OGG_SFX = false` para `USE_OGG_SFX = true`
5. `npm run build && npm run dev` pra validar

Se algum OGG faltar, o jogo loga warning e cai em fallback sintetizado pra esse
SFX especifico (graceful degrade — outros que existirem tocam normal).

## Por que OGG e nao MP3?

- OGG Vorbis e patent-free, suportado por todos os browsers atuais
- Phaser sound suporta nativamente
- Tamanho menor pra mesmo bitrate em pulsos curtos
