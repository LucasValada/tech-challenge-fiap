# Contratos entre os microsserviços — Fase 4

> **Rascunho para revisão do grupo** (passo 1.2 do plano de ação). Depois de aprovado, este documento é a referência para os três serviços trabalharem em paralelo; qualquer mudança passa por PR aqui.

Serviços: **OS Service** (este repositório, orquestrador da Saga), **Billing Service** e **Execution Service**.

## 1. Regras gerais

- **Nenhum serviço acessa o banco de outro.** O que um serviço precisa saber de outro chega numa mensagem (e ele guarda uma cópia) ou por uma chamada REST.
- **Mudança de estado entre serviços é mensagem; consulta e ação do usuário é REST.**
- **Só o OS Service publica comandos.** Billing e Execution executam o comando e respondem na fila `saga-respostas`; eles não conversam entre si.
- **Entrega "pelo menos uma vez".** O SQS pode entregar a mesma mensagem mais de uma vez, então todo consumidor é idempotente: guarda os `messageId` já processados e confere o estado atual antes de agir.
- **Falha no processamento** devolve a mensagem para a fila (retry automático do SQS); depois de 5 tentativas (`maxReceiveCount = 5`) ela vai para a DLQ da fila.
- **Mensagem fora de hora** (por exemplo, uma resposta para uma OS já cancelada) é descartada com um log de aviso, sem erro.
- **`correlationId`** nasce na abertura da OS (ou vem do header `x-correlation-id` da requisição), viaja em toda mensagem e em toda chamada HTTP, e aparece em todo log JSON. É por ele que se acompanha uma OS nos logs dos três serviços no New Relic.

## 2. Envelope

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

## 3. Filas

Filas SQS padrão (não FIFO), cada uma com a sua DLQ (`<fila>-dlq`). A ordem entre mensagens não importa porque o orquestrador confere o estado da OS antes de agir. O Terraform de cada fila fica no repositório de quem a consome.

| Fila | Terraform no repositório | Publica | Consome |
|---|---|---|---|
| `execucao-comandos` | Execution | OS | Execution |
| `billing-comandos` | Billing | OS | Billing |
| `saga-respostas` | OS | Billing e Execution | OS |

## 4. Mensagens

### Comandos (OS → serviços)

| Tipo | Fila | `payload` |
|---|---|---|
| `IniciarDiagnostico` | `execucao-comandos` | `{ codigo, veiculo: { placa, marca, modelo, ano }, observacoes }` |
| `IniciarReparo` | `execucao-comandos` | `{ codigo, servicos: [{ nome, quantidade }], itens: [{ nome, quantidade }] }` |
| `GerarOrcamento` | `billing-comandos` | `{ codigo, cliente: { id, nome, email }, servicos: [{ servicoId, nome, precoUnitario, quantidade, subtotal }], itens: [{ itemEstoqueId, nome, precoUnitario, quantidade, subtotal }], valorServicos, valorPecas, valorTotal }` |
| `CancelarOrcamento` | `billing-comandos` | `{ motivo }` — cancela o orçamento e expira o link de pagamento, se existir |
| `EstornarPagamento` | `billing-comandos` | `{ motivo }` — estorna o pagamento aprovado da OS |

Os itens e preços de `GerarOrcamento` são os snapshots das linhas da OS (`nomeSnapshot`, `precoUnitario`, `subtotal`), então o Billing não precisa consultar o catálogo. Valores em reais, com duas casas decimais.

### Respostas (serviços → OS, fila `saga-respostas`)

| Tipo | Publica | `payload` |
|---|---|---|
| `DiagnosticoIniciado` | Execution | `{ iniciadoEm }` |
| `DiagnosticoConcluido` | Execution | `{ concluidoEm }` |
| `OrcamentoEnviado` | Billing | `{ orcamentoId, valorTotal }` |
| `OrcamentoAprovado` | Billing | `{ orcamentoId }` |
| `OrcamentoRecusado` | Billing | `{ orcamentoId, motivo }` |
| `PagamentoConfirmado` | Billing | `{ pagamentoId, valor, pagoEm }` — `pagamentoId` é o id do pagamento no Mercado Pago |
| `PagamentoRecusado` | Billing | `{ motivo: "recusado" \| "expirado", detalhe }` |
| `PagamentoEstornado` | Billing | `{ pagamentoId, estornadoEm }` |
| `ReparoConcluido` | Execution | `{ concluidoEm }` |
| `ExecucaoFalhou` | Execution | `{ etapa: "diagnostico" \| "reparo", motivo }` |

## 5. A Saga no orquestrador

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
| `EM_EXECUCAO` | `ExecucaoFalhou` (reparo) | **compensa:** publica `EstornarPagamento` e devolve o estoque | `CANCELADA` |
| `RECEBIDA` ou `EM_DIAGNOSTICO` | `ExecucaoFalhou` (diagnóstico) | **compensa:** devolve o estoque, se algo foi lançado | `CANCELADA` |
| `CANCELADA` | `PagamentoEstornado` | registra no histórico da OS | `CANCELADA` |
| `FINALIZADA` | Entrega (REST, funcionário) | envia o e-mail de entrega | `ENTREGUE` (fim) |

Toda passagem para `CANCELADA` grava o motivo. Se um pagamento aprovado chegar ao Billing depois de `CancelarOrcamento`, o próprio Billing estorna e publica `PagamentoEstornado`.

## 6. APIs REST

Todos os serviços validam o mesmo JWT (segredo `JWT_SECRET` do SSM):

- **funcionário:** `{ sub, email }`, emitido por `POST /auth/login` do OS Service;
- **cliente:** `{ sub, tipo: "cliente", cpf, nome }`, emitido pela Lambda de auth. O cliente só acessa o que é dele: o `sub` do token precisa bater com o `clienteId` da OS ou do orçamento.

Cada serviço expõe `/health` e o Swagger em `/api` (OS) ou com o prefixo do serviço (Billing e Execution).

### OS Service (mantém as rotas atuais)

- **Continuam:** `/auth/login`, `/cliente`, `/veiculos`, `/servicos`, `/itens-estoque`, `/user`, `/ordens-servico` (abertura, consulta, linhas de serviço e itens), `/ordens-servico/minhas` (consulta do cliente), `/public/ordens-servico/:codigo` e `/ordens-servico/relatorios/...`.
- **Saem para o Billing:** `POST /ordens-servico/:id/enviar-orcamento` (vira automático pela Saga), `POST /ordens-servico/minhas/:id/aprovar`, `POST /ordens-servico/minhas/:id/rejeitar` e `POST /webhooks/orcamento`.
- **Muda:** `POST /ordens-servico/:id/transicao-status` passa a aceitar só `FINALIZADA → ENTREGUE`.
- **Nova:** `GET /internal/clientes/por-cpf/:cpf`, protegida pelo header `x-internal-token`. Devolve `{ id, nome, status }` para a Lambda de auth, que deixa de ler o banco.

### Billing Service (prefixo `/billing`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /billing/orcamentos/os/:osId` | funcionário ou cliente dono | Consulta o orçamento da OS |
| `POST /billing/orcamentos/:id/aprovar` | cliente dono | Aprova, cria a preferência no Mercado Pago e devolve `{ linkPagamento }` (também enviado por e-mail) |
| `POST /billing/orcamentos/:id/recusar` | cliente dono | Recusa o orçamento |
| `POST /billing/webhooks/orcamento` | sistema externo (`x-webhook-token`) | Aprovação ou recusa externa, como o webhook atual do OS |
| `POST /billing/webhooks/mercadopago` | Mercado Pago (público) | Recebe o aviso e confirma consultando `GET /v1/payments/{id}`; nunca confia só no conteúdo do aviso |
| `GET /billing/pagamentos/os/:osId` | funcionário | Pagamento e estorno da OS |

### Execution Service (prefixo `/execucao`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /execucao/fila?tipo=diagnostico\|reparo` | funcionário | Lista as tarefas pendentes, mais antigas primeiro |
| `GET /execucao/tarefas/os/:osId` | funcionário | Tarefas de uma OS |
| `POST /execucao/tarefas/:id/iniciar` | funcionário | Inicia a tarefa (no diagnóstico, publica `DiagnosticoIniciado`) |
| `POST /execucao/tarefas/:id/concluir` | funcionário | Conclui a tarefa (publica `DiagnosticoConcluido` ou `ReparoConcluido`) |
| `POST /execucao/tarefas/:id/falhar` | funcionário | Registra a falha com `{ motivo }` (publica `ExecucaoFalhou`) |

## 7. O que cada serviço guarda

| Serviço | Banco | Dados próprios | Cópias recebidas por mensagem |
|---|---|---|---|
| OS | PostgreSQL | Clientes, veículos, usuários, catálogo, estoque, OS, linhas, histórico e estado da saga | — |
| Billing | PostgreSQL próprio | Orçamentos, pagamentos e estornos | Cliente (id, nome, e-mail) e linhas do orçamento, vindos de `GerarOrcamento` |
| Execution | DynamoDB | Tarefas de diagnóstico e reparo | Código da OS, veículo e itens a executar, vindos dos comandos |

## 8. Para decidir na reunião

- Nomes das mensagens, das filas e das rotas.
- Se a aprovação externa (`POST /billing/webhooks/orcamento`) continua existindo, ou se basta a aprovação pelo cliente.
