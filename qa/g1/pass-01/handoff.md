# QA G1 - Pass 01 - Handoff

**Sprint:** G1
**Pass:** 01
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-01

---

## 1. Para reverificacao desta sprint (pass-02 em diante)

### O que foi coberto nesta rodada
- Workflow `.github/workflows/deploy.yml` lido via `git show c1c1e48` — estrutura, permissoes, triggers, concurrency, actions usadas.
- `jogo/vite.config.ts` lido via `git show 5fc6645` — base path condicional.
- `.gitignore` raiz e `jogo/.gitignore` lidos via `git show 2dfab0d`.
- `LICENSE`, `README.md`, `COMO_RODAR.md`, `jogo/README.md`, `jogo/package.json` — todos lidos.
- Varredura manual de todos os 35 arquivos versionados (via `git log --name-only`) em busca de secrets.

### O que NAO foi validado e precisa de validacao futura

| Item | Por que nao validado | Como validar |
|------|---------------------|--------------|
| Deploy funcionando em prod | `gh` nao instalado, sem acesso ao Actions UI | Abrir `https://github.com/terra-gentil/terra-gentil-game/actions` e verificar run de `deploy.yml` com status verde |
| GitHub Pages habilitado com source "GitHub Actions" | Settings do repo nao acessivel localmente | Abrir `https://github.com/terra-gentil/terra-gentil-game/settings/pages` e confirmar source = "GitHub Actions" |
| URL publica funcionando | Nao acessivel sem browser | Abrir `https://terra-gentil.github.io/terra-gentil-game/` e confirmar que o jogo carrega |
| Branch protection em main | GitHub API nao acessivel | Verificar Settings > Branches no GitHub UI |
| `npm run preview` comportamento real | Nao instalei deps (conforme regras) | Rodar `npm run build && npm run preview` localmente e checar se assets carregam |

### Gaps conhecidos desta pass
- Nao foi possivel confirmar se o primeiro deploy (apos habilitar Pages manualmente) passou ou ainda esta pendente.
- Nao foi verificado o conteudo de `pesquisa/analise/` em detalhe — fora do escopo de G1 mas relevante para verificar que nenhum dado sensivel foi commitado ali.

### O que precisa ser checado a cada nova rodada de G1
1. O workflow `deploy.yml` ainda existe e nao foi modificado por commits subsequentes de forma que quebre G1?
   - Verificar: `git log --oneline -- .github/workflows/deploy.yml`
2. O `vite.config.ts` ainda tem `base: command === 'build' ? '/terra-gentil-game/' : './'`?
   - Verificar: `git show HEAD:jogo/vite.config.ts | grep base`
3. O bundle nao cresceu desproporcionalmente (Phaser sem tree-shaking)?
   - Verificar: tamanho de `jogo/dist/assets/` apos build

---

## 2. Para o QA da proxima sprint

### Contratos estabelecidos pela G1 (invariantes a preservar)

| Contrato | Onde esta definido | Como verificar que nao regrediu |
|----------|-------------------|---------------------------------|
| Workflow so dispara em push pra `main` com mudancas em `jogo/**` ou no proprio workflow | `.github/workflows/deploy.yml:6-10` | `git show HEAD:.github/workflows/deploy.yml \| grep -A5 "on:"` |
| Permissoes minimas: `contents:read`, `pages:write`, `id-token:write` | `.github/workflows/deploy.yml:11-14` | Verificar que nao foram adicionadas permissoes como `actions:write`, `packages:write`, `secrets` |
| Base path prod: `/terra-gentil-game/` | `jogo/vite.config.ts:4` | `git show HEAD:jogo/vite.config.ts \| grep base` |
| Base path dev: `./` | `jogo/vite.config.ts:4` | Idem |
| Deploy automatico no push pra main (so jogo/) | `.github/workflows/deploy.yml` | Nenhum commit em `pesquisa/` ou `README.md` deve triggerar build |
| `npm ci` (nao `npm install`) — builds repetiveis | `.github/workflows/deploy.yml:40` | Verificar que Install step nao mudou para `npm install` |
| `private: true` em package.json — sem risco de publish acidental | `jogo/package.json:3` | `git show HEAD:jogo/package.json \| grep private` |

### Sinais de regressao a monitorar em G2+

1. **Base path quebrado:** Se alguem mudar `vite.config.ts` para `base: './'` fixo (sem condicional), o site em `https://terra-gentil.github.io/terra-gentil-game/` vai carregar com assets em 404. Sintoma: pagina branca no GitHub Pages, console com erros `GET /assets/... 404`.

2. **Workflow ampliado com permissoes extras:** Se um job novo precisar de `contents: write` (ex: para commit de artefatos), verificar que isso nao vaza para o job de build/deploy.

3. **`pull_request_target` adicionado:** Se alguem adicionar este trigger para rodar checks em PRs de fork, o deploy vai ser vulneravel a fork injection. Monitorar: `git show HEAD:.github/workflows/deploy.yml | grep pull_request_target`.

4. **actions sem SHA pin adicionadas:** Se uma action de terceiro (nao `actions/*`) for adicionada sem SHA pin, isso eh P1 imediato. Verificar toda nova linha `uses:` que nao seja `actions/`.

5. **Dependencias npm adicionadas sem atualizar package-lock:** Verificar que `package-lock.json` esta sempre em sync com `package.json` (o `npm ci` do workflow quebra se nao estiver).

6. **sourcemap expondo codigo sensivel:** Hoje o jogo nao tem logica de backend. Se logica sensivel for adicionada no cliente (ex: chaves hardcoded para API de ranking), `sourcemap: true` em build vai expor isso. Monitorar na G7+.

### Contexto tecnico util para o proximo QA

- A URL publica do jogo (quando Pages estiver funcionando): `https://terra-gentil.github.io/terra-gentil-game/`
- O workflow usa OIDC (via `id-token: write` + `actions/deploy-pages@v4`) — nao usa Personal Access Token nem deploy key. Isso eh o padrao mais seguro para Pages.
- O `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` no env do workflow forca as actions a rodarem em Node 24 em vez de Node 20. Nao afeta o node da build (que usa `actions/setup-node@v4 with: node-version: '20'`). Em junho/2026 o GitHub vai forcar Node 24 globalmente — apos essa data, o env var pode ser removido.
- Phaser 3.90 usa `^3.90.0` no package.json (com caret). Minor updates sao automaticos no proximo `npm install`. Em geral seguro, mas monitorar changelogs do Phaser em atualizacoes de patch/minor para breaking changes em API publica.
