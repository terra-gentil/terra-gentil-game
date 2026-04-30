# QA do Projeto

Relatorios de QA por sprint. Cada rodada de revisao gera uma `pass-XX` numerada
dentro da pasta da sprint. Cada pass tem `relatorio.md` (achados) e `handoff.md`
(notas pra futuros QAs).

## Estrutura

```
qa/
  README.md
  g0/
    pass-01/
      relatorio.md     <- o que foi achado nessa rodada
      handoff.md       <- notas pra futuras revisoes
  g1/
    pass-01/
      relatorio.md
      handoff.md
  g2/...
  g3/...
```

## Politica

- A cada sprint nova (G4, G5, ...) lancamos QAs **pra todas as sprints** (antigas e nova).
  Isso pega regressoes em codigo antigo causadas por mudancas novas.
- Cada nova rodada cria `pass-02`, `pass-03`, ... na pasta da sprint.
- Cada QA roda em sub-agente Sonnet isolado. Eles nao leem o trabalho um do outro
  no mesmo run, mas leem **handoffs anteriores** (de passes prévios) ao iniciar.

## Severidade dos achados

- **P0** bloqueante (jogo nao roda, secret vazado, build quebra)
- **P1** sério (bug funcional reproduzivel, vulnerabilidade)
- **P2** moderado (UX prejudicada, dead code com risco)
- **P3** cosmético (typo, inconsistencia menor, nice-to-have)

## Formato dos achados

Cada finding cita `arquivo:linha` e tem trecho do código relevante. Nada de vague.

## Formato do handoff

Duas secoes:
1. **Para reverificacao desta sprint** — o que ja foi testado, o que ficou
   pendente (ex: "nao consegui validar o jogo no mobile real")
2. **Para QA da proxima sprint** — invariantes/contratos que essa sprint
   estabeleceu, coisas pra ficar de olho ao validar codigo novo
