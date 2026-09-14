# ADR-001 — Ator da trilha de auditoria em ações de cliente

| | |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-08-31 |
| **Relacionados** | [RFC-001 — Estratégia de autenticação](../rfc/RFC-001-estrategia-autenticacao.md) |

## Contexto

Cada transição de status de uma OS registra uma linha em `HistoricoStatusOS`, formando a trilha de auditoria (quem mudou o quê, quando). O modelo é:

```prisma
model HistoricoStatusOS {
  id             String   @id @default(uuid())
  ordemServicoId String
  status         StatusOrdemServico
  usuarioId      String                     // FK obrigatória → Usuario
  observacao     String?
  createdAt      DateTime @default(now())
  usuario        Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Restrict)
}
```

O campo `usuarioId` é uma **FK obrigatória para `Usuario`** (funcionários: atendentes, mecânicos, administradores).

Com a autenticação por CPF (ver RFC-001), o **cliente** passou a executar transições de status — aprovar (`AGUARDANDO_APROVACAO → EM_EXECUCAO`) e rejeitar (`AGUARDANDO_APROVACAO → EM_DIAGNOSTICO`) o próprio orçamento. Mas o cliente **não é** um `Usuario`: ele vive no modelo `Cliente`, uma tabela distinta. Logo, não existe um `usuarioId` válido que represente o cliente para gravar no histórico.

## Decisão

Nas ações de cliente, registrar no histórico o **`usuarioCriadorId` da própria OS** (o funcionário que a criou) como `usuarioId`, e **identificar o ator real na `observacao`** com um texto explícito:

- Aprovação: `"Orçamento aprovado pelo cliente (autenticação por CPF)"`
- Rejeição: `"Orçamento recusado pelo cliente (autenticação por CPF)"`

Ou seja: a coluna `usuarioId` satisfaz a integridade referencial (sempre aponta para um `Usuario` existente), e a **verdade sobre o ator** fica na `observacao`. O mesmo padrão já era usado pelo fluxo de decisão via webhook externo, então a convenção fica consistente entre os dois canais não-administrativos.

## Alternativas consideradas

1. **Tornar `usuarioId` anulável e adicionar um campo de ator para cliente** (ex.: `clienteId` nullable, ou um par polimórfico `atorTipo` + `atorId`). É a modelagem "correta" da auditoria, mas exige **migração de schema**, ajuste de todas as leituras do histórico e das projeções/relatórios que hoje assumem `usuario` sempre presente. Fora do escopo da frente de autenticação.
2. **Criar um `Usuario` "sistema"/"cliente"** e apontar todas as ações de cliente para ele. Resolve a FK, mas mistura conceitos (um cliente não é um usuário interno) e ainda perderia a identidade do cliente específico — pior do que a `observacao`.
3. **Manter `usuarioCriadorId` + `observacao` descritiva** (escolhida): custo zero de schema, integridade preservada, ator legível na trilha.

## Consequências

### Positivas
- **Sem mudança de schema** e sem impacto nas leituras existentes do histórico.
- **Integridade referencial preservada** (`usuarioId` sempre válido, `onDelete: Restrict` intacto).
- O ator real fica **legível** na trilha via `observacao`, de forma consistente entre ações de cliente por CPF e decisões via webhook.

### Negativas
- A coluna `usuarioId`, lida isoladamente, **atribui a ação ao funcionário criador da OS**, não ao cliente — é impreciso para consumidores que olham só o campo estruturado (sem ler a `observacao`).
- A identidade do cliente na trilha é **textual**, não relacional: não dá para filtrar/join por cliente diretamente nas linhas de histórico geradas por ações de cliente.
