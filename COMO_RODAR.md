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

## Backend ranking (FastAPI)

Local dev:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate    # Linux/Mac
.venv\Scripts\activate       # Windows PowerShell

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Endpoints sobem em `http://localhost:8000`. CORS ja libera `http://localhost:5173`
por default, entao o jogo em dev encontra o backend automaticamente — mas pra
isso o jogo precisa apontar pro local em vez do prod. A URL fica hardcoded em
`jogo/src/config/Constants.ts`. Em dev local, edite `RANKING_API_URL` pra
`http://localhost:8000` enquanto trabalha (lembrar de reverter antes de commit)
ou aponte pro prod (default).

Tests:

```bash
cd backend
pytest
```

Deploy: push em `main` aciona Railway via `backend/railway.toml`. URL prod:
`https://terra-gentil-game-production.up.railway.app`.

## Estrutura do projeto

```
terra-gentil-game/
  pesquisa/
    lawn-mower-original/      <- repo original do Shiru (referencia, gitignored)
    analise/                  <- relatorios de engenharia reversa
      ANALISE_LAWN_MOWER.md
      assets-extraidos/
        patterns_grayscale.png
        patterns_lawn.png
        palettes.json
        fases_editor.json     <- 10 niveis (autoritativo)
  jogo/                       <- jogo Phaser 3 (codigo principal)
    src/
      config/Constants.ts     <- GAME_WIDTH, COLORS, RANKING_API_URL
      config/GameConfig.ts    <- registra scenes
      scenes/BootScene.ts
      scenes/TitleScene.ts
      scenes/GameScene.ts
      scenes/RankingScene.ts
      ui/SubmitModal.ts
      api/RankingApi.ts
      state/RunStats.ts
      audio/SfxPlayer.ts
      types/Level.ts
      types/Ranking.ts
      main.ts
    public/assets/
    index.html
    package.json
    tsconfig.json
    vite.config.ts
  backend/                    <- FastAPI ranking (deploy Railway)
    app/
      main.py
      models.py
      db.py
      validation.py
    tests/
    Dockerfile
    railway.toml
    requirements.txt
    README.md
  qa/                         <- relatorios de QA por sprint (4 rounds ate G8)
  COMO_RODAR.md
  README.md
  HANDOFF.md                  <- contexto pra retomar em outro chat
```
