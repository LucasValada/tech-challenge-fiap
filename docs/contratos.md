# Contratos entre os microsserviços — Fase 4

> **Versão 1, para revisão do grupo** (passo 1.2 do plano de ação). Os nomes de filas, mensagens e rotas já estão definidos pelas convenções da seção 2. Depois de aprovado, este documento é a referência para os três serviços trabalharem em paralelo; qualquer mudança passa por PR aqui.

Serviços: **OS Service** (este repositório, orquestrador da Saga), **Billing Service** e **Execution Service**.

## 1. Regras gerais

- **Nenhum serviço acessa o banco de outro.** O que um serviço precisa saber de outro chega numa mensagem (e ele guarda uma cópia) ou por uma chamada REST.
- **Mudança de estado entre serviços é mensagem; consulta e ação do usuário é REST.**
- **Só o OS Service publica comandos.** Billing e Execution executam o comando e respondem na fila `oficina-os-saga-replies`; eles não conversam entre si.
- **Entrega "pelo menos uma vez".** O SQS pode entregar a mesma mensagem mais de uma vez, então todo consumidor é idempotente: guarda os `messageId` já processados e confere o estado atual antes de agir.
- **Falha no processamento** devolve a mensagem para a fila (retry automático do SQS); depois de 5 tentativas (`maxReceiveCount = 5`) ela vai para a DLQ da fila.
- **Mensagem fora de hora** (por exemplo, uma resposta para uma OS já cancelada) é descartada com um log de aviso, sem erro.
- **`correlationId`** nasce na abertura da OS (ou vem do header `x-correlation-id` da requisição), viaja em toda mensagem e em toda chamada HTTP, e aparece em todo log JSON. É por ele que se acompanha uma OS nos logs dos três serviços no New Relic.

## 2. Convenções de nomes

| O quê | Convenção | Exemplo |
|---|---|---|
| Identificador técnico do serviço | Nome curto em inglês, o mesmo em repositório, namespace, imagem, fila e prefixo de rota | `os`, `billing`, `execution` |
| Fila SQS | kebab-case: `oficina-<serviço que consome>-<propósito>`; a DLQ repete o nome com `-dlq`. Respeita as regras do SQS: letras, números, `-` e `_`, até 80 caracteres | `oficina-billing-commands`, `oficina-billing-commands-dlq` |
| Mensagem (`tipo`) | PascalCase, em português (é linguagem do domínio). **Comando no imperativo** (pede uma ação); **resposta no particípio** (relata o que aconteceu) | `GerarOrcamento` → `OrcamentoEnviado` |
| Campos JSON | camelCase, como no código atual; datas em ISO 8601 (UTC); valores em reais com duas casas; enums em MAIÚSCULAS, como os status da OS | `valorTotal: 440.00`, `motivo: "EXPIRADO"` |
| Rota REST | kebab-case, recursos no plural, prefixo do serviço; filtros por query string; ação de negócio como sub-recurso com verbo (`POST /recurso/{id}/acao`, o estilo de Stripe e GitHub e o mesmo do OS atual) | `POST /billing/orcamentos/{id}/aprovar` |
| Webhook e rota interna | `/webhooks/<origem>` para chamadas de fora; `/internal/...` para chamadas entre componentes nossos, protegidas por token | `/billing/webhooks/mercado-pago` |

## 3. Envelope

Toda mensagem tem o mesmo formato; só o `payload` muda por tipo.

```json
{
  "messageId": "0b8c6c1e-5a1f-4c3e-9a51-2f4e8d7b1a90",
  "correlationId": "7d2f0a4e-6c1b-4b2a-8f3e-1c9d5e7a2b64",
  "osId": "c56f9df1-b6f7-4625-84ce-a27706664ae5",
  "tipo": "GerarOrcamento",
  "ocorridoEm": "2026-10-20T14:03:00.000Z",
  "payload": {}
}
```

## 4. Filas

Filas SQS padrão (não FIFO), cada uma com a sua DLQ. A ordem entre mensagens não importa porque o orquestrador confere o estado da OS antes de agir. O Terraform de cada fila fica no repositório de quem a consome.

| Fila | DLQ | Terraform no repositório | Publica | Consome |
|---|---|---|---|---|
| `oficina-execution-commands` | `oficina-execution-commands-dlq` | Execution | OS | Execution |
| `oficina-billing-commands` | `oficina-billing-commands-dlq` | Billing | OS | Billing |
| `oficina-os-saga-replies` | `oficina-os-saga-replies-dlq` | OS | Billing e Execution | OS |

## 5. Mensagens

### Comandos (OS → serviços)

| Tipo | Fila | `payload` |
|---|---|---|
| `IniciarDiagnostico` | `oficina-execution-commands` | `{ codigo, veiculo: { placa, marca, modelo, ano }, observacoes }` |
| `IniciarReparo` | `oficina-execution-commands` | `{ codigo, servicos: [{ nome, quantidade }], itens: [{ nome, quantidade }] }` |
| `GerarOrcamento` | `oficina-billing-commands` | `{ codigo, cliente: { id, nome, email }, servicos: [{ servicoId, nome, precoUnitario, quantidade, subtotal }], itens: [{ itemEstoqueId, nome, precoUnitario, quantidade, subtotal }], valorServicos, valorPecas, valorTotal }` |
| `CancelarOrcamento` | `oficina-billing-commands` | `{ motivo }` — cancela o orçamento e expira o link de pagamento, se existir |
| `EstornarPagamento` | `oficina-billing-commands` | `{ motivo }` — estorna o pagamento aprovado da OS |

Os itens e preços de `GerarOrcamento` são os snapshots das linhas da OS (`nomeSnapshot`, `precoUnitario`, `subtotal`), então o Billing não precisa consultar o catálogo.

### Respostas (serviços → OS, fila `oficina-os-saga-replies`)

| Tipo | Publica | `payload` |
|---|---|---|
| `DiagnosticoIniciado` | Execution | `{ iniciadoEm }` |
| `DiagnosticoConcluido` | Execution | `{ concluidoEm }` |
| `OrcamentoEnviado` | Billing | `{ orcamentoId, valorTotal }` |
| `OrcamentoAprovado` | Billing | `{ orcamentoId, origem: "CLIENTE" \| "SISTEMA_EXTERNO" }` |
| `OrcamentoRecusado` | Billing | `{ orcamentoId, origem: "CLIENTE" \| "SISTEMA_EXTERNO", motivo }` |
| `PagamentoConfirmado` | Billing | `{ pagamentoId, valor, pagoEm }` — `pagamentoId` é o id do pagamento no Mercado Pago |
| `PagamentoRecusado` | Billing | `{ motivo: "RECUSADO" \| "EXPIRADO", detalhe }` |
| `PagamentoEstornado` | Billing | `{ pagamentoId, estornadoEm }` |
| `ReparoConcluido` | Execution | `{ concluidoEm }` |
| `ExecucaoFalhou` | Execution | `{ etapa: "DIAGNOSTICO" \| "REPARO", motivo }` |

## 6. A Saga no orquestrador

O que o OS Service faz ao receber cada resposta. As transições de status da OS passam a vir daqui; a única transição manual que sobra é a entrega.

| Status atual da OS | Evento | O orquestrador faz | Novo status |
|---|---|---|---|
| — | Abertura da OS (REST) | publica `IniciarDiagnostico` | `RECEBIDA` |
| `RECEBIDA` | `DiagnosticoIniciado` | — | `EM_DIAGNOSTICO` |
| `EM_DIAGNOSTICO` | (mecânico lança serviços e itens na OS pelo REST atual; o estoque é baixado como hoje) | — | — |
| `EM_DIAGNOSTICO` | `DiagnosticoConcluido` | publica `GerarOrcamento` com os snapshots | `EM_DIAGNOSTICO` |
| `EM_DIAGNOSTICO` | `OrcamentoEnviado` | — | `AGUARDANDO_APROVACAO` |
| `AGUARDANDO_APROVACAO` | `OrcamentoAprovado` | — | `AGUARDANDO_PAGAMENTO` |
| `AGUARDANDO_APROVACAO` | `OrcamentoRecusado` | **compensa:** devolve o estoque | `CANCELADA` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoConfirmado` | publica `IniciarReparo` | `EM_EXECUCAO` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoRecusado` | **compensa:** publica `CancelarOrcamento` e devolve o estoque | `CANCELADA` |
| `EM_EXECUCAO` | `ReparoConcluido` | envia o e-mail de finalização (Lambda `/mail`) | `FINALIZADA` |
| `EM_EXECUCAO` | `ExecucaoFalhou` (`REPARO`) | **compensa:** publica `EstornarPagamento` e devolve o estoque | `CANCELADA` |
| `RECEBIDA` ou `EM_DIAGNOSTICO` | `ExecucaoFalhou` (`DIAGNOSTICO`) | **compensa:** devolve o estoque, se algo foi lançado | `CANCELADA` |
| `CANCELADA` | `PagamentoEstornado` | registra no histórico da OS | `CANCELADA` |
| `FINALIZADA` | Entrega (REST, funcionário) | envia o e-mail de entrega | `ENTREGUE` (fim) |

Toda passagem para `CANCELADA` grava o motivo. Se um pagamento aprovado chegar ao Billing depois de `CancelarOrcamento`, o próprio Billing estorna e publica `PagamentoEstornado`.

## 7. APIs REST

Todos os serviços validam o mesmo JWT (segredo `JWT_SECRET` do SSM):

- **funcionário:** `{ sub, email }`, emitido por `POST /auth/login` do OS Service;
- **cliente:** `{ sub, tipo: "cliente", cpf, nome }`, emitido pela Lambda de auth. O cliente só acessa o que é dele: o `sub` do token precisa bater com o `clienteId` da OS ou do orçamento.

Health e Swagger: o OS mantém `/health` e `/api`; Billing e Execution usam o próprio prefixo (`/billing/health`, `/billing/api`, `/execution/health`, `/execution/api`). No Ingress, o OS fica com as rotas sem prefixo, e `/billing` e `/execution` vão para os serviços novos.

### OS Service (mantém as rotas atuais)

- **Continuam:** `/auth/login`, `/cliente`, `/veiculos`, `/servicos`, `/itens-estoque`, `/user`, `/ordens-servico` (abertura, consulta, linhas de serviço e itens), `/ordens-servico/minhas` (consulta do cliente), `/public/ordens-servico/{codigo}` e `/ordens-servico/relatorios/...`.
- **Saem para o Billing:** `POST /ordens-servico/{id}/enviar-orcamento` (vira automático pela Saga), `POST /ordens-servico/minhas/{id}/aprovar`, `POST /ordens-servico/minhas/{id}/rejeitar` e `POST /webhooks/orcamento`.
- **Muda:** `POST /ordens-servico/{id}/transicao-status` passa a aceitar só `FINALIZADA → ENTREGUE`.
- **Nova:** `POST /internal/clientes/busca`, com `{ cpf }` no corpo e protegida pelo header `x-internal-token`. Devolve `{ id, nome, status }` para a Lambda de auth, que deixa de ler o banco. É `POST`, e não `GET`, para o CPF não aparecer na URL, que vai para os logs.

### Billing Service (prefixo `/billing`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /billing/orcamentos?osId={osId}` | funcionário ou cliente dono | Lista os orçamentos da OS |
| `GET /billing/orcamentos/{id}` | funcionário ou cliente dono | Consulta um orçamento |
| `POST /billing/orcamentos/{id}/aprovar` | cliente dono | Aprova, cria a preferência no Mercado Pago e devolve `{ linkPagamento }`, também enviado por e-mail |
| `POST /billing/orcamentos/{id}/recusar` | cliente dono | Recusa o orçamento, com `{ motivo }` opcional |
| `POST /billing/webhooks/orcamento` | sistema externo (`x-webhook-token`) | **Aprovação externa, que continua existindo:** aprova ou recusa como o webhook atual do OS. Na aprovação, o link de pagamento é criado e enviado ao cliente por e-mail |
| `POST /billing/webhooks/mercado-pago` | Mercado Pago (público) | Recebe o aviso e confirma consultando `GET /v1/payments/{id}`; nunca confia só no conteúdo do aviso |
| `GET /billing/pagamentos?osId={osId}` | funcionário | Pagamento e estorno da OS |

### Execution Service (prefixo `/execution`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /execution/tarefas?status=PENDENTE&tipo=DIAGNOSTICO` | funcionário | A fila: lista as tarefas filtradas por status (`PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDA`, `FALHOU`), tipo (`DIAGNOSTICO`, `REPARO`) ou `osId`, mais antigas primeiro |
| `GET /execution/tarefas/{id}` | funcionário | Consulta uma tarefa |
| `POST /execution/tarefas/{id}/iniciar` | funcionário | Inicia a tarefa (no diagnóstico, publica `DiagnosticoIniciado`) |
| `POST /execution/tarefas/{id}/concluir` | funcionário | Conclui a tarefa (publica `DiagnosticoConcluido` ou `ReparoConcluido`) |
| `POST /execution/tarefas/{id}/falhar` | funcionário | Registra a falha com `{ motivo }` (publica `ExecucaoFalhou`) |

## 8. O que cada serviço guarda

| Serviço | Banco | Dados próprios | Cópias recebidas por mensagem |
|---|---|---|---|
| OS | PostgreSQL | Clientes, veículos, usuários, catálogo, estoque, OS, linhas, histórico e estado da saga | — |
| Billing | PostgreSQL próprio | Orçamentos, pagamentos e estornos | Cliente (id, nome, e-mail) e linhas do orçamento, vindos de `GerarOrcamento` |
| Execution | DynamoDB | Tarefas de diagnóstico e reparo | Código da OS, veículo e itens a executar, vindos dos comandos |
