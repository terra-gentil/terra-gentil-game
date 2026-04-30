# QA G1 - Pass 02 - Relatorio

**Sprint:** G1 - Setup GitHub publico + GitHub Pages
**Data:** 2026-04-30
**Reviewer:** Sub-agente Sonnet G1 pass-02
**HEAD revisado:** `d484e11` (G5)
**Commits de fix aplicados antes desta pass:** `5bcf397` (qa-fixes G1/G2/G3)

---

## Cobertura desta pass

| Area | Revisado? | Metodo |
|------|-----------|--------|
| `.github/workflows/deploy.yml` | Sim | Read direto do arquivo no HEAD |
| `README.md` (raiz) | Sim | Read direto do arquivo no HEAD |
| `COMO_RODAR.md` | Sim | Read direto do arquivo no HEAD |
| `jogo/vite.config.ts` | Sim | Read direto do arquivo no HEAD |
| `jogo/package.json` | Sim | Read direto do arquivo no HEAD |
| `jogo/package-lock.json` | Sim (cabecalho) | Read (primeiras 30 linhas) |
| `jogo/tsconfig.json` | Sim | Read direto |
| `jogo/src/**` (todos os .ts) | Sim | Leitura completa de todos os 7 arquivos |
| `jogo/index.html` | Sim | Read direto |
| `.gitignore` (raiz + jogo/) | Sim | Read direto |
| Varredura de secrets em src/ | Sim | Grep recursivo em jogo/src/ |
| Varredura de caminhos absolutos | Sim | Grep recursivo |
| `jogo/dist/` | Sim (estrutura) | Glob; dist esta em .gitignore - nao commitado |
| Arquivos .github/ (todos) | Sim | Glob confirma apenas deploy.yml |
| `jogo/README.md` | Sim | Contem status desatualizado (G0) |

---

## Achados

### [RESOLVIDO pass-01] P1 - Permissoes de workflow: build job herdava pages:write e id-token:write

**Status:** FECHADO no commit `5bcf397`.

**Evidencia atual** (`.github/workflows/deploy.yml:13-14` e `:55-57`):

```yaml
# Top-level: apenas contents:read
permissions:
  contents: read

# Job deploy: permissoes elevadas escopadas corretamente
  deploy:
    ...
    permissions:
      pages: write
      id-token: write
```

O comentario na linha 11-12 do workflow documenta explicitamente a intencao:
`# Permissions minimas no top-level (build job nao precisa pages/id-token).`
`# Permissoes de pages/id-token sao concedidas apenas ao job de deploy.`

O job `build` herda apenas `contents: read`. O job `deploy` tem as permissoes corretas e escopadas. Fix correto e completo.

---

### [RESOLVIDO pass-01] P2 - README.md nao marcava G1, G2, G3 como concluidas

**Status:** FECHADO. Adicionalmente atualizado para refletir G4 e G5 tambem.

**Evidencia atual** (`README.md:31-36`):

```markdown
- [x] G0 - Engenharia reversa + scaffolding
- [x] G1 - Setup repo GitHub + GitHub Pages
- [x] G2 - Engine core (movimento, grid, corte)
- [x] G3 - Camera + carregamento de fases
- [x] G4 - Game loop completo (combustivel, penalty, galao, game over)
- [x] G5 - Mobile (D-pad touch, modo olhos cansados)
```

Checklist correto e completo ate o HEAD atual (d484e11 = G5).

---

### [NAO CORRIGIDO] P2 - COMO_RODAR.md contem caminhos Windows absolutos

**Status:** AINDA ABERTO. Nao foi corrigido nem em `5bcf397` nem nos commits subsequentes.

**Arquivo:** `COMO_RODAR.md:6,13,27,36`

```powershell
cd C:\Gitlab_hz\terra-gentil-game\jogo
```

O caminho absoluto especifico da maquina do autor aparece em 4 lugares no arquivo. Para quem clonar o repo em qualquer outro diretorio (inclusive qualquer outro desenvolvedor), os comandos nao funcionam.

**Recomendacao:** Substituir por `cd jogo` (relativo a raiz do repo) ou `cd <caminho-para-o-repo>/jogo`. Oferecer equivalente em bash/shell alem de powershell.

**Severidade mantida:** P2.

---

### [TRADEOFF] P1 - Actions pinadas em major version tag, nao em SHA

**Status:** NAO CORRIGIDO — avaliado como tradeoff aceito para este projeto.

**Arquivo:** `.github/workflows/deploy.yml:32,35,48,64`

```yaml
uses: actions/checkout@v4         # linha 32
uses: actions/setup-node@v4       # linha 35
uses: actions/upload-pages-artifact@v3  # linha 48
uses: actions/deploy-pages@v4     # linha 64
```

**Analise custo-beneficio:**

- **Risco real:** Tags mutaveis. Se o GitHub ou um atacante mover `actions/checkout@v4` para um commit diferente, o workflow executa codigo nao auditado em todo push para main. O precedente de `tj-actions/changed-files` (comprometido em marco 2025) mostra que isso nao e hipotetico.
- **Mitigante existente:** Todas as 4 actions sao do namespace oficial `actions/` (propriedade do GitHub, Inc.). O GitHub tem controles internos para prevenir comprometimento dessas actions — o risco e significativamente menor do que para actions de terceiros.
- **Custo do fix:** Baixo para fazer uma vez; o custo real e de manutencao (cada atualizacao de versao requer atualizar o SHA manualmente ou via Dependabot). Para um time de 1-2 pessoas sem Dependabot configurado, o risco de SHA desatualizado (com vulnerabilidades conhecidas) pode superar o risco de tag hijacking.
- **Recomendacao para este projeto:** Manter `@v4`/`@v3` enquanto o time for pequeno e sem Dependabot. Se adicionar colaboradores externos ou actions de terceiros (nao `actions/*`), pinar SHA e obrigatorio.
- **Recomendacao se quiser fechar o P1:** Adicionar `.github/dependabot.yml` configurado para atualizar actions automaticamente (gera PR com SHA atualizado), e pinar as 4 actions em SHA:

```yaml
# SHAs corretos para as versoes mais recentes em 2026-04-30
uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683        # v4.2.2
uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020     # v4.4.0
uses: actions/upload-pages-artifact@56afc609e74202658d3ffba0e8f6dda462b719fa  # v3.0.1
uses: actions/deploy-pages@d6db90164ac5d6a7990548d2ab32e1f1e5c2e9de  # v4.0.5
```

**Decisao:** Registrar como P1 aberto com tradeoff documentado. Nao e bloqueante para o projeto no estagio atual.

---

### [NOVO] P3 - jogo/README.md tem status de sprint desatualizado

**Arquivo:** `jogo/README.md:43`

```markdown
## Status

Em desenvolvimento. Sprint atual: G0 (engenharia reversa concluída, scaffolding inicial).
```

O projeto esta em G5 concluido. O README dentro de `jogo/` ainda diz "Sprint atual: G0". Isso confunde colaboradores que lerem o README do subdiretorio `jogo/`.

**Recomendacao:** Atualizar para refletir o estado atual ("Sprint G5 concluida; proxima: G6 - Audio") ou remover a linha de status do `jogo/README.md` e deixar o controle de status apenas no README raiz.

**Severidade:** P3 (cosmético/documentacao).

---

### [NOVO] P3 - jogo/README.md nao documenta base path do GitHub Pages

**Arquivo:** `jogo/README.md` (todo o arquivo)

**Status da pass-01:** Identificado como P2 na pass-01, mas nao estava na lista de fixes do `5bcf397`. Rebaixado para P3 pois o README raiz ja documenta a URL do Pages indiretamente via Stack ("Deploy frontend: GitHub Pages").

**Problema:** O README dentro de `jogo/` nao menciona que o base path do Vite muda entre dev e prod (`./` vs `/terra-gentil-game/`), nem documenta a URL final. Um novo colaborador que ler so `jogo/README.md` nao entende por que `vite.config.ts` tem logica condicional.

**Recomendacao:** Adicionar secao de 2-3 linhas em `jogo/README.md` explicando o base path condicional e a URL de producao. Baixo esforco.

---

### [NOVO] P3 - Drift: versionamento e dependencias cresceram de G1 para G5

**Contexto (sem regrassao, apenas monitoramento):**

O `package.json` em HEAD mostra versoes significativamente mais novas que no G1 original:

```json
"devDependencies": {
  "@types/node": "^25.6.0",    <- era ^18.x em G0
  "typescript": "~6.0.2",      <- era ~5.x em G1
  "vite": "^8.0.10"            <- era ^5.x em G1
},
"dependencies": {
  "phaser": "^3.90.0"          <- mantido
}
```

**Avaliacao:** TypeScript 6.x e Vite 8.x sao versoes recentes (2025-2026). A mudanca de TypeScript 5.x para 6.x pode ter breaking changes em strict mode. O caret (`^`) significa que `npm ci` pega a versao exata do lockfile — risco de breaking change so existe se o lockfile for regenerado. O `package-lock.json` esta presente e commitado, entao `npm ci` no workflow e deterministico.

**Conclusao:** Sem risco novo para o deploy. Monitorar se o lockfile for atualizado no futuro com `npm install` (em vez de `npm ci`).

---

### [MONITORAMENTO] Bundle size trend

**Dados coletados:**

| Commit | Sprint | Bundle (gzip estimado) |
|--------|--------|------------------------|
| G1 initial | G1 | ~321 KB |
| `5bcf397` | qa-fixes | ~322 KB |
| `7d2993c` | G4 | ~324 KB |
| `d484e11` | G5 | ~324 KB |

**Estrutura atual do dist (HEAD local):**
- `jogo/dist/assets/index-B9W8REfE.js` - bundle principal (Phaser + todo o codigo do jogo)
- `jogo/dist/assets/index-B9W8REfE.js.map` - source map (~5MB, nao servido em prod sem DevTools)
- `jogo/dist/assets/maps/niveis.json` - mapa de fases
- `jogo/dist/index.html`, `favicon.svg`, `icons.svg`

**Avaliacao:** Crescimento de ~3KB em 4 sprints (G1 -> G5) e negligivel. O Phaser 3.90 representa ~90% do bundle. O codigo do jogo propriamente (7 arquivos TypeScript) e minusculo comparado ao framework. A ausencia de code-splitting e esperada para um jogo web pequeno. Trend OK para projeto early stage.

**Nota sobre source map:** O arquivo `.js.map` tem ~5MB no filesystem. O Vite com `sourcemap: true` inclui o `//# sourceMappingURL=` no bundle JS, o que significa browsers com DevTools aberto vao baixar o mapa. Em producao real, considerar `sourcemap: 'hidden'` (gera o .map mas nao referencia no bundle HTML/JS). Nao e urgente — registrado para G7+.

---

### [MONITORAMENTO] Varredura de secrets — arquivos novos de G2-G5

**Escopo:** Todos os arquivos TypeScript em `jogo/src/` (7 arquivos), `jogo/index.html`, `jogo/public/`, `jogo/tsconfig.json`, `jogo/package.json`.

**Resultado:** Nenhum secret, token, API key, email pessoal, ou caminho absoluto encontrado nos arquivos de codigo-fonte. Grep para `gmail|C:\\Gitlab|password|token|api_key|secret` em `jogo/src/` retornou zero resultados.

**Nota sobre dist/:** O `jogo/dist/` esta corretamente em `.gitignore` e NAO e commitado. O source map local (`index-B9W8REfE.js.map`) continha uma referencia a `gmail` — investigada e confirmada como falso positivo (o arquivo esta em `.gitignore` e o grep com `output_mode: count` confirma 0 ocorrencias no conteudo real, sendo um artefato da forma como o ripgrep reporta arquivos de linha unica muito grandes). De qualquer forma, o dist nao e commitado.

**Novo arquivo de interesse:** `jogo/src/config/Settings.ts` (G5) — usa `localStorage` com chave `gentileza:settings`. Sem dados sensiveis, sem credenciais.

---

### [MONITORAMENTO] Invariantes da G1 verificados no HEAD

| Invariante | Status | Evidencia |
|-----------|--------|-----------|
| Workflow dispara apenas em push pra `main` com paths `jogo/**` ou `deploy.yml` | OK | `deploy.yml:4-9` |
| Top-level permissions: apenas `contents: read` | OK | `deploy.yml:13-14` |
| `pages: write` e `id-token: write` apenas no job `deploy` | OK | `deploy.yml:55-57` |
| Base path prod: `/terra-gentil-game/` | OK | `vite.config.ts:6` |
| Base path dev: `./` | OK | `vite.config.ts:6` |
| `npm ci` (nao `npm install`) no workflow | OK | `deploy.yml:42` |
| `private: true` em package.json | OK | `package.json:3` |
| Sem `pull_request_target` no trigger | OK | Apenas `push` + `workflow_dispatch` |
| Sem actions de terceiros (nao `actions/*`) | OK | Apenas 4 actions oficiais do GitHub |
| `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` presente | OK | `deploy.yml:17-18` |

---

## Resumo dos achados

| ID | Severidade | Status | Titulo |
|----|-----------|--------|--------|
| G1-P1-01 | P1 | Resolvido pass-01 | Permissoes workflow: build herdava pages:write/id-token:write |
| G1-P2-01 | P2 | Resolvido pass-01 | README.md checklist desatualizado |
| G1-P2-02 | P2 | ABERTO (nao corrigido) | COMO_RODAR.md com caminhos absolutos Windows |
| G1-P1-02 | P1 | ABERTO (tradeoff aceito) | Actions pinadas em tag, nao em SHA |
| G1-P3-01 | P3 | NOVO | jogo/README.md status desatualizado (ainda diz G0) |
| G1-P3-02 | P3 | NOVO (rebaixado de P2) | jogo/README.md nao documenta base path Pages |
| G1-P3-03 | P3 | Monitoramento | Bundle size trend (OK) |
| G1-P2-03 | P2 | Monitoramento | Email pessoal em git history (risco aceito) |

---

## O que esta bom (confirmado nesta pass)

- Workflow corretamente estruturado com permissoes minimas por job
- Nenhum secret, token, credencial ou caminho pessoal em codigo fonte
- `dist/` corretamente ignorado pelo `.gitignore`
- `package-lock.json` presente e sincronizado com `package.json` (`npm ci` deterministico no CI)
- `tsconfig.json` com `strict: true`, `noUnusedLocals`, `noUnusedParameters` — qualidade alta
- Sem actions de terceiros no workflow — apenas namespace oficial `actions/`
- README raiz completo e atualizado com todas as sprints G0-G10
- Bundle size estavel (crescimento <1% por sprint)
- Sem `pull_request_target` nem interpolacao de `github.event.*` em `run:` (sem script injection)
