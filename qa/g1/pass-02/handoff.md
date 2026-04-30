# QA G1 - Pass 02 - Handoff

**Sprint:** G1
**Pass:** 02
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-02
**HEAD revisado:** `d484e11` (G5)

---

## 1. Para reverificacao desta sprint (pass-03 em diante)

### O que foi coberto nesta rodada

- `.github/workflows/deploy.yml` lido diretamente do filesystem no HEAD d484e11 — estrutura completa, permissoes por job, triggers, actions usadas.
- `jogo/vite.config.ts` lido — base path condicional confirmado intacto.
- `README.md` raiz lido — checklist G0-G10 confirmado atualizado.
- `COMO_RODAR.md` lido — caminhos absolutos ainda presentes (nao corrigido).
- `jogo/package.json` e `jogo/package-lock.json` (cabecalho) lidos — versoes confirmadas, lockfile presente.
- `jogo/tsconfig.json` lido — strict mode ativo.
- Todos os 7 arquivos TypeScript em `jogo/src/` lidos — sem secrets ou caminhos pessoais.
- `jogo/index.html` lido — sem secrets.
- `.gitignore` raiz e `jogo/.gitignore` confirmados.
- Varredura grep por secrets/emails/caminhos em `jogo/src/`, `jogo/public/`, arquivos raiz.
- Estrutura de `jogo/dist/` verificada (nao commitada, corretamente em .gitignore).
- Todos os arquivos em `.github/` verificados (apenas 1 workflow, sem novos arquivos).

### O que NAO foi validado e precisa de validacao futura

| Item | Por que nao validado | Como validar |
|------|---------------------|--------------|
| Deploy funcionando em prod | Sem acesso ao GitHub Actions UI | `https://github.com/terra-gentil/terra-gentil-game/actions` — verificar run verde |
| GitHub Pages habilitado com source "GitHub Actions" | Settings nao acessivel localmente | `https://github.com/terra-gentil/terra-gentil-game/settings/pages` |
| URL publica funcionando | Nao acessivel sem browser | `https://terra-gentil.github.io/terra-gentil-game/` |
| Branch protection em main | GitHub API nao acessivel | Settings > Branches no GitHub UI |
| SHA dos commits das actions | Nao verificado via GitHub API | `gh api repos/actions/checkout/git/refs/tags/v4` para confirmar SHA atual |
| `npm run preview` comportamento real | Deps nao instaladas no QA | Rodar `npm run build && npm run preview` e verificar se assets carregam |

### Gaps conhecidos desta pass

- O source map local (`jogo/dist/assets/index-B9W8REfE.js.map`) e um arquivo de linha unica muito grande (~5MB). O ripgrep reportou um match de `gmail` nele, mas o mode `count` retornou 0 — comportamento inconsistente do ripgrep com arquivos de linha unica extremamente longos. De qualquer forma, `dist/` esta corretamente em `.gitignore` e nao e commitado.
- Nao foi possivel executar `npm run build` para medir o tamanho real do bundle gzip nesta pass — os dados de bundle size vieram do historico da pass-01 e dos commits mencionados no brief.

### O que precisa ser checado a cada nova rodada de G1

1. **Permissoes do workflow continuam minimas?**
   - `git show HEAD:.github/workflows/deploy.yml | grep -A3 "permissions:"`
   - Esperado: `contents: read` no top-level, `pages: write` + `id-token: write` apenas no job `deploy`.

2. **Base path do vite.config.ts intacto?**
   - `git show HEAD:jogo/vite.config.ts | grep base`
   - Esperado: `command === 'build' ? '/terra-gentil-game/' : './'`

3. **Nenhuma nova action de terceiro adicionada?**
   - `git show HEAD:.github/workflows/deploy.yml | grep "uses:"` — confirmar que todas as linhas `uses:` sao do namespace `actions/`.

4. **COMO_RODAR.md ainda tem caminhos absolutos?**
   - P2 aberto desde pass-01 — verificar se foi corrigido em sprints futuras.

---

## 2. Para o QA da proxima sprint

### Contratos estabelecidos pela G1 (invariantes a preservar)

Todos os contratos listados no handoff da pass-01 continuam validos e confirmados no HEAD d484e11:

| Contrato | Onde esta definido | Status em d484e11 |
|----------|-------------------|-------------------|
| Workflow dispara em push/main com paths `jogo/**` ou `deploy.yml` | `deploy.yml:4-9` | OK |
| Top-level permissions: apenas `contents: read` | `deploy.yml:13-14` | OK |
| `pages: write` e `id-token: write` apenas no job `deploy` | `deploy.yml:55-57` | OK |
| Base path prod: `/terra-gentil-game/` | `vite.config.ts:6` | OK |
| Base path dev: `./` | `vite.config.ts:6` | OK |
| `npm ci` no workflow (nao `npm install`) | `deploy.yml:42` | OK |
| `private: true` em package.json | `package.json:3` | OK |
| Sem `pull_request_target` no trigger | `deploy.yml:3-9` | OK |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` | `deploy.yml:17-18` | OK (remover apos junho/2026) |

### Itens abertos que passam para pass-03 (se houver)

1. **G1-P2-02 ABERTO:** `COMO_RODAR.md` com caminhos absolutos `C:\Gitlab_hz\terra-gentil-game\jogo` nas linhas 6, 13, 27 e 36. Nao corrigido em nenhum commit ate d484e11.

2. **G1-P1-02 TRADEOFF:** Actions em `@v4`/`@v3` sem SHA pin. Decisao: aceitar para actions oficiais `actions/*` enquanto nao houver Dependabot configurado. Reabrir se actions de terceiros forem adicionadas.

3. **G1-P3-01 NOVO:** `jogo/README.md:43` ainda diz "Sprint atual: G0". Atualizar para estado real (G5 concluida, G6 pendente).

4. **G1-P3-02 NOVO:** `jogo/README.md` nao documenta base path do GitHub Pages. Adicionar secao curta.

### Sinais de regressao a monitorar em G6+

1. **Permissoes escaladas no job build:** Se alguem mover `pages: write` ou `id-token: write` para o top-level ou para o job `build`, P1 imediato.

2. **Action de terceiro sem SHA pin:** Se qualquer linha `uses:` nova nao for do namespace `actions/`, P1 imediato. Verificar: `git show HEAD:.github/workflows/deploy.yml | grep uses:`.

3. **`pull_request_target` adicionado:** Risco de fork injection. Verificar: `git show HEAD:.github/workflows/deploy.yml | grep pull_request_target`.

4. **`npm install` em vez de `npm ci` no workflow:** Quebra a reproducibilidade do build.

5. **Base path hardcoded:** Se `vite.config.ts` mudar para `base: './'` sem condicional, o site em producao vai 404 todos os assets.

6. **Variavel `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`:** Remover apos junho/2026 quando GitHub forcar Node 24 globalmente (o env var se tornara obsoleto e pode gerar warnings).

### Contexto tecnico atualizado

- Versoes de dependencias no HEAD: TypeScript 6.0.x, Vite 8.0.x, @types/node 25.x, Phaser 3.90.x. Significativamente mais novas que no G1 original.
- O lockfile esta em `jogo/package-lock.json` (lockfileVersion: 3) — sincronizado com package.json, `npm ci` no CI e deterministico.
- `tsconfig.json` com `strict: true`, `noUnusedLocals`, `noUnusedParameters` — bom padrao de qualidade.
- O codigo do jogo cresceu para 7 arquivos TypeScript em G5: `main.ts`, `GameConfig.ts`, `Settings.ts`, `Level.ts`, `BootScene.ts`, `TitleScene.ts`, `GameScene.ts`.
- `Settings.ts` usa `localStorage` com chave `gentileza:settings` — sem dados sensiveis, mecanismo de persistencia limpo.
- Bundle size estavel (~324KB gzip em G5 vs ~321KB em G1). Phaser domina o tamanho.
- `jogo/dist/` NAO commitado (corretamente em .gitignore). Deploy e feito via GitHub Actions que roda o build na nuvem.
