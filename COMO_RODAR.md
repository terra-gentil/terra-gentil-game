# Como rodar o jogo localmente

Os comandos abaixo assumem que voce esta na raiz do repo clonado
(ex: `cd terra-gentil-game`). Os blocos com `cd jogo` vao a partir
dali. Ajuste os caminhos conforme onde voce clonou.

## Primeira vez

```bash
cd jogo
npm install
```

## Rodar em modo dev (hot reload)

```bash
cd jogo
npm run dev
```

Abre no navegador: http://localhost:5173

Pra testar no celular na mesma rede Wi-Fi:
1. Descobre o IP do PC: `ipconfig` no Windows ou `ip addr` no Linux/Mac (procura IPv4 do adaptador Wi-Fi)
2. No celular, abre: `http://<seu-ip>:5173`
3. Joga e valida tamanho dos sprites pro publico 40-70

## Build de producao

```bash
cd jogo
npm run build
```

Saida em `jogo/dist/`. Arquivos prontos pra GitHub Pages.

## Preview do build

```bash
cd jogo
npm run preview
```

## Estrutura do projeto

```
terra-gentil-game/
  pesquisa/
    lawn-mower-original/      <- repo original do Shiru (referencia)
    analise/                  <- relatorios de engenharia reversa
      ANALISE_LAWN_MOWER.md
      assets-extraidos/
        patterns_grayscale.png
        patterns_lawn.png
        palettes.json
  jogo/                       <- jogo Phaser 3 (codigo principal)
    src/
      config/GameConfig.ts
      scenes/BootScene.ts
      scenes/TitleScene.ts
      scenes/GameScene.ts
      main.ts
    public/assets/
    index.html
    package.json
    tsconfig.json
    vite.config.ts
  COMO_RODAR.md
  README.md
```
