# QA G1 - Pass 01 - Relatorio

**Sprint:** G1 - Setup GitHub publico + GitHub Pages
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-01
**Commits revisados:**
- `5fc6645` - G1: workflow de deploy GitHub Pages + ajuste base path
- `c1c1e48` - G1: opt-in Node 24 nas actions

**Commits contexto (lidos mas nao revisados nesta sprint):**
- `18d8f27` - G0+: LICENSE MIT + atribuicao Shiru (base para review de LICENSE)
- `2dfab0d` - G0: scaffolding inicial (base para .gitignore, COMO_RODAR, README)

---

## Cobertura

| Area | Revisado? | Metodo |
|------|-----------|--------|
| `.github/workflows/deploy.yml` | Sim | `git show c1c1e48:.github/workflows/deploy.yml` |
| `jogo/vite.config.ts` | Sim | `git show 5fc6645:jogo/vite.config.ts` |
| `.gitignore` (raiz) | Sim | `git show 2dfab0d:.gitignore` |
| `jogo/.gitignore` | Sim | `git show 2dfab0d:jogo/.gitignore` |
| `LICENSE` | Sim | `git show 18d8f27:LICENSE` |
| `README.md` (raiz) | Sim | `git show caa959c:README.md` (estado atual) |
| `jogo/README.md` | Sim | `git show 2dfab0d:jogo/README.md` |
| `COMO_RODAR.md` | Sim | `git show 2dfab0d:COMO_RODAR.md` |
| `jogo/package.json` | Sim | `git show 2dfab0d:jogo/package.json` |
| Secrets / emails em commits | Parcial | `git log --format="%ae"`, varredura manual dos arquivos versionados |
| Status do deploy (Actions run) | Nao | Sem acesso ao GitHub Actions UI nem `gh` CLI instalado |
| Branch protection rules | Nao | Nao verificavel localmente |

---

## Achados

### P1 - Permissoes de workflow excessivas: build job herda pages:write e id-token:write

**Arquivo:** `.github/workflows/deploy.yml:11-14`

```yaml
permissions:
  contents: read
  pages: write
  id-token: write
```

**Problema:** As permissoes estao declaradas apenas no nivel do workflow (top-level), sem override por job. O job `build` nao precisa de `pages: write` nem de `id-token: write` — ele so faz checkout, npm ci, npm run build e upload do artefato. Essas permissoes extras ficam disponiveis durante o job de build, que executa codigo de terceiros (Vite, TypeScript, Phaser e todas as transitive deps do `node_modules`). Se qualquer dep do build for comprometida (supply chain), ela tem acesso a `id-token` OIDC, o que permite autenticar em servicos que confiem no OIDC do GitHub Actions.

**Recomendacao:** Mover `pages: write` e `id-token: write` para o escopo do job `deploy`, e deixar o job `build` so com `contents: read`. Exemplo:

```yaml
permissions:
  contents: read        # minimo para o build job

jobs:
  build:
    # herda contents: read — correto
    ...

  deploy:
    permissions:
      pages: write
      id-token: write
    ...
```

---

### P1 - Actions pinadas em major version tag, nao em SHA

**Arquivo:** `.github/workflows/deploy.yml:27,30,42,58`

```yaml
uses: actions/checkout@v4
uses: actions/setup-node@v4
uses: actions/upload-pages-artifact@v3
uses: actions/deploy-pages@v4
```

**Problema:** Tags de major version (`@v4`, `@v3`) sao mutaveis — o dono do repositorio pode mover a tag para um commit diferente a qualquer momento. Se uma dessas actions for comprometida (como aconteceu com `tj-actions/changed-files` em marco 2025), o workflow executa codigo malicioso automaticamente em todo push pra main. Actions oficiais da GitHub (`actions/*`) tem risco menor, mas nao zero.

**Recomendacao:** Pinar cada action em SHA imutavel do commit mais recente da tag atual, com comentario indicando qual versao o SHA corresponde. Exemplo:

```yaml
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
```

Ferramentas como `pin-github-action` ou Dependabot com `groups` podem automatizar a atualizacao dos SHAs.

**Severidade aceita:** Em repos pequenos open-source (como este), usar `@v4` de actions oficiais da GitHub eh pratica comum e risco tolerado. Mas eh formalmente P1 por politica de seguranca de CI/CD.

---

### P1 - `npm run preview` usa base='./' em vez de base='/terra-gentil-game/'

**Arquivo:** `jogo/vite.config.ts:4`

```ts
base: command === 'build' ? '/terra-gentil-game/' : './',
```

**Arquivo:** `jogo/package.json:8`

```json
"preview": "vite preview --host"
```

**Problema:** O comando `vite preview` serve o `dist/` buildado, mas o Vite considera `command === 'serve'` (nao `'build'`) tanto para `dev` quanto para `preview`. Portanto, quando o dev roda `npm run preview` para testar o build de producao localmente, o Vite injeta `base='./'` no contexto de configuracao — mas os arquivos em `dist/` ja foram buildados com `base='/terra-gentil-game/'` gravado dentro deles (nos hashes dos chunks). O server de preview serve os assets com o path absoluto baked-in, e o `'./'` no vite.config so afeta o template HTML injetado em modo preview, nao os assets dentro de `dist/`.

Na pratica isso significa: `npm run preview` com `--host` serve corretamente (porque o vite preview server resolve os paths internos do dist), mas se o dev tentar servir `dist/` com qualquer outro servidor HTTP estatico (nginx, `npx serve`, Python http.server) apontado para a raiz, os assets vao quebrar porque esperam ser servidos em `/terra-gentil-game/`. Isso cria confusao no debugging pre-deploy.

**Recomendacao:** Documentar o comportamento em `COMO_RODAR.md`: "Para preview local do build de producao, use `npm run preview` (nao sirva `dist/` direto com outro servidor)." Alternativa mais robusta: criar script `"preview:prod": "vite preview --base /terra-gentil-game/"` que forca o base path correto no preview server.

---

### P2 - README.md nao marca G1 como concluida

**Arquivo:** `README.md:24` (estado no commit `caa959c`, mais recente)

```markdown
- [x] G0 - Engenharia reversa + scaffolding
- [ ] G1 - Setup repo GitHub + GitHub Pages
- [ ] G2 - Engine core (movimento, grid, corte)
```

**Problema:** G1 foi concluida (commits `5fc6645` e `c1c1e48`), G2 foi concluida (`c1a9b6a`) e G3 tambem (`caa959c`). O status checklist no README esta desatualizado — apenas G0 marcado como concluido, ignorando G1, G2 e G3.

**Recomendacao:** Marcar `[x]` para G0, G1, G2 e G3 no README.md, mantendo o checklist como indicador real do progresso.

---

### P2 - COMO_RODAR.md contem caminhos Windows absolutos do desenvolvedor

**Arquivo:** `COMO_RODAR.md:5,11`

```powershell
cd C:\Gitlab_hz\terra-gentil-game\jogo
npm install
```

**Problema:** Caminhos absolutossao especificos para a maquina do autor (`C:\Gitlab_hz\...`) e nao funcionam para outros colaboradores ou para quem clonar o repo de outro lugar. Alem de ser confuso, documenta implicitamente a estrutura de diretorios local do desenvolvedor, o que eh uma informacao desnecessaria num repositorio publico.

**Recomendacao:** Substituir todos os `cd C:\Gitlab_hz\terra-gentil-game\jogo` por `cd jogo` (caminho relativo a partir da raiz do repo clonado). Usar `bash` em vez de `powershell` nos blocos de codigo, ou ao menos oferecer ambos.

---

### P2 - jogo/README.md nao documenta base path do GitHub Pages

**Arquivo:** `jogo/README.md` (todo o arquivo)

**Problema:** O README dentro de `jogo/` nao menciona que o `base` path do Vite muda entre dev e prod, nem documenta a URL final do GitHub Pages. Um novo colaborador que ler so esse README nao saberah que o site fica em `https://terra-gentil.github.io/terra-gentil-game/` nem entenderah por que o `vite.config.ts` tem logica condicional.

**Recomendacao:** Adicionar secao curta documentando URL de producao e o comportamento do base path.

---

### P2 - Email pessoal do autor em git commit history

**Evidencia:** `git log --format="%ae"` retorna `eng.andrehz@gmail.com` para todos os commits.

**Contexto:** O repositorio eh publico (declarado no brief). O email do autor fica visivel via `git log` para qualquer pessoa que clonar o repo.

**Avaliacao:** Nao eh um secret vazado (email nao eh credencial). Eh o email que o proprio autor usa publicamente (aparece ate no campo de creditos da LICENSE via `shiru@mail.ru` como referencia). Mas para um repositorio publico, usar um email de trabalho ou email de org (ex: `terra-gentil@...`) seria mais profissional e evitaria spam direcionado.

**Recomendacao:** Configurar `user.email` no git config com um email de org ou alias antes de continuar commitando neste repo publico. Nao eh possivel remover do historico sem rebase destrutivo — documentar como risco aceito.

---

### P3 - concurrency.cancel-in-progress: true pode deixar deploy incompleto em janela estreita

**Arquivo:** `.github/workflows/deploy.yml:21-22`

```yaml
concurrency:
  group: pages
  cancel-in-progress: true
```

**Problema:** Se dois pushes chegam rapidamente, o segundo cancela o primeiro. Se o job `deploy` do primeiro ja iniciou (apos build concluir), o cancelamento pode interromper o deploy a meio, potencialmente deixando o GitHub Pages num estado inconsistente por alguns segundos. Na pratica, o GitHub Pages tem sua propria atomicidade no lado do servidor e esse cenario eh improvavel com o ritmo de commits do projeto.

**Recomendacao:** Manter como esta. O comportamento atual eh standard para GitHub Pages workflows. Documentar como decisao consciente.

---

### P3 - `cancel-in-progress: false` seria mais seguro para o job deploy (variante alternativa nao implementada)

Relacionado ao item anterior: o padrao oficial do GitHub Pages Quick Start usa `cancel-in-progress: false`. A diferenca eh sutil e irrelevante para este projeto no ritmo atual, mas vale registro.

---

### P3 - Shiru email em LICENSE.md

**Arquivo:** `LICENSE:37`

```
**Shiru** (shiru@mail.ru) e publicado em https://shiru.untergrund.net/software.shtml
```

**Avaliacao:** O email `shiru@mail.ru` eh publico — aparece no proprio header do `game.dasm` original e no site do Shiru. Nao constitui exposicao indevida. A atribuicao eh correta e necessaria.

---

## O que esta bom

**Seguranca geral do workflow:**
- `permissions: contents: read` como base eh correto — nao usa o padrao `permissions: write-all`.
- `pull_request_target` nao esta presente. O trigger eh `push:branches:[main]` + `workflow_dispatch`. Nao ha risco de fork injection via PRs.
- Nenhum secret customizado referenciado. Usa apenas o `GITHUB_TOKEN` implicito via OIDC (id-token), que eh o padrao recomendado para Pages.
- Nao ha `${{ github.event.* }}` sendo interpolado em `run:` — sem risco de script injection.

**Path filter correto:**
- O workflow so dispara em mudancas em `jogo/**` ou no proprio `deploy.yml`. Mudancas em `pesquisa/` ou `README.md` nao trigam build desnecessario.

**Vite config:**
- A logica `command === 'build' ? '/terra-gentil-game/' : './'` eh clara e correta para os dois casos principais: prod Pages e dev Wi-Fi no celular.
- `server.host: true` garante que o dev server aceita conexoes de outros dispositivos na rede local — cobre o caso de uso mobile documentado.
- `sourcemap: true` em build facilita debugging de producao sem expor codigo fonte diretamente (source maps so sao uteis com DevTools).

**Node 24 opt-in:**
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` em env nivel workflow eh a forma correta de fazer opt-in preemptivo, conforme documentacao GitHub. Evita o warning nos logs e prepara para a mudanca forcada de junho/2026.

**Concurrency:**
- `group: pages` garante que apenas um deploy acontece por vez. Correto.

**LICENSE:**
- MIT correta, texto padrao completo.
- Atribuicao ao Shiru eh clara, cita dominio publico, cita o repo sehugg/lawn-mower-nes.
- Afirma explicitamente que nenhum bit do ASM foi copiado — importante para clareza legal.
- Mencao a marca Gentileza com referencia ao INPI classes 28 e 41.
- Mencao a Phaser 3 (Photon Storm Ltd, MIT) correta.
- FamiTone mencionada como nao usada — honesto e completo.

**Gitignore:**
- `pesquisa/lawn-mower-original/` corretamente ignorado na raiz.
- `.env` e `.env.local` cobertos em ambos os `.gitignore`.
- `node_modules/` coberto.
- `dist/` coberto.
- Nenhum arquivo sensivel encontrado nos commits.

**Nenhum secret, token ou credencial nos commits:**
- Varredura manual de todos os arquivos versionados (35 arquivos, listados via `git log --name-only`) nao encontrou tokens, API keys, ou senhas.

---

## Riscos nao tratados (nao verificaveis localmente)

1. **Branch protection:** Nao foi possivel verificar se a branch `main` tem protecao habilitada (require PR review, dismiss stale reviews, require status checks). Sem branch protection, qualquer colaborador com push access pode fazer push direto pra main e triggerar deploy.

2. **Status do primeiro deploy:** O brief menciona que a primeira tentativa falhou por Pages nao habilitado. Nao foi possivel verificar via `gh` (nao instalado) se o deploy subsequente passou. Verificar no GitHub Actions UI: `https://github.com/terra-gentil/terra-gentil-game/actions`.

3. **GitHub Pages habilitado com source correto:** Verificar nas Settings do repo se Pages esta configurado como "GitHub Actions" (nao branch `gh-pages`). Se estiver configurado como branch, o workflow `deploy-pages@v4` vai falhar silenciosamente ou com erro de configuracao.

4. **Dependabot ou similar:** Nao ha `.github/dependabot.yml` configurado para atualizar as actions (verificado via lista de arquivos commitados). Com actions em `@v4` sem SHA pin, vulnerabilidades em versoes menores nao sao detectadas automaticamente.

5. **Tamanho do bundle:** Nao verificado. Phaser 3 eh pesado (~1MB minificado). Com `sourcemap: true`, o bundle de producao inclui source maps que podem aumentar o tempo de carregamento. Monitorar em sprints futuras.

---

## Recomendacoes para sprints futuras

1. **G2+:** Separar permissoes por job no workflow (ver P1 acima). Baixo esforco, alto valor de seguranca.

2. **G2+:** Adicionar `.github/dependabot.yml` para atualizar actions automaticamente (com PR review). Garante que SHAs ou tags sejam mantidos atualizados.

3. **G2+:** Corrigir README.md checklist (marcar G1, G2, G3 como concluidas). P2 trivial.

4. **G2+:** Corrigir COMO_RODAR.md removendo caminhos absolutos. P2 trivial.

5. **G3+:** Avaliar se `sourcemap: true` em prod eh intencional ou se deve ser movido para `sourcemap: 'hidden'` (gera o .map mas nao referencia no bundle, util para Sentry sem expor fonte).

6. **Pre-lancamento (G9/G10):** Rever se o email `eng.andrehz@gmail.com` no git history eh aceitavel para um repo publico de marca registrada.

7. **Qualquer sprint:** Verificar branch protection no GitHub UI antes de adicionar mais colaboradores.
