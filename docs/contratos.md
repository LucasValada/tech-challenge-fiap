# Contratos entre os microsserviços — Fase 4

> **Versão 1, para revisão do grupo** (passo 1.2 do plano de ação). Os nomes de filas, mensagens e rotas já estão definidos pelas convenções da seção 2. Depois de aprovado, este documento é a referência para os três serviços trabalharem em paralelo; qualquer mudança passa por PR aqui.

Serviços: **OS Service** (este repositório, orquestrador da Saga), **Billing Service** e **Execution Service**.

## 1. Regras gerais

- **Nenhum serviço acessa o banco de outro.** O que um serviço precisa saber de outro chega numa mensagem (e ele guarda uma cópia) ou por uma chamada REST.
- **Mudança de estado entre serviços é mensagem; consulta e ação do usuário é REST.**
- **Só o OS Service publica comandos.** Billing e Execution executam o comando e respondem na fila `oficina-os-saga-replies`; eles não conversam entre si.
- **Entrega "pelo menos uma vez".** O SQS pode entregar a mesma mensagem mais de uma vez, então todo consumidor é idempotente pela verificação de estado e por chaves naturais: uma OS tem um só orçamento, uma tarefa por tipo, e um pagamento só é estornado uma vez; o que já foi feito é ignorado. Não é preciso tabela de mensagens processadas. O `messageId` serve para o rastreio nos logs.
- **Gravar e publicar na mesma transação.** Quem grava no banco e publica uma mensagem faz as duas coisas dentro da mesma transação, publicando antes do commit. Se a publicação falhar, a transação é desfeita e a requisição falha (ou o consumo, que o SQS repete), então nada fica gravado sem a mensagem correspondente. No caso raro inverso (mensagem publicada e commit com falha), o destino recebe uma mensagem fora de hora e a trata como tal. É a alternativa enxuta ao outbox transacional.
- **Falha de negócio vira resposta; falha técnica vira nova tentativa.** Se o executor não consegue cumprir um comando por motivo de negócio (dados inválidos, recurso indisponível), ele responde com a mensagem de falha (`ExecucaoFalhou` ou `GeracaoOrcamentoFalhou`) e o orquestrador compensa. Falha técnica (serviço fora, erro de rede) devolve a mensagem para a fila (retry automático do SQS); depois de 5 tentativas (`maxReceiveCount = 5`) ela vai para a DLQ, que dispara um alerta, e é reprocessada (*redrive*) depois da correção. Os comandos de compensação (`CancelarOrcamento` e `EstornarPagamento`) também são idempotentes e seguem essa mesma regra, então uma compensação nunca se perde.
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

Configuração das filas: *visibility timeout* de 60 s (maior que o timeout de 10 s das chamadas externas feitas dentro de um consumidor, como o estorno no Mercado Pago), *long polling* de 20 s e DLQ com retenção de 14 dias.

## 5. Mensagens

### Comandos (OS → serviços)

| Tipo | Fila | `payload` |
|---|---|---|
| `IniciarDiagnostico` | `oficina-execution-commands` | `{ codigo, veiculo: { placa, marca, modelo, ano }, observacoes }` |
| `IniciarReparo` | `oficina-execution-commands` | `{ codigo, veiculo: { placa, marca, modelo, ano }, servicos: [{ nome, quantidade }], itens: [{ nome, quantidade }] }` |
| `GerarOrcamento` | `oficina-billing-commands` | `{ codigo, cliente: { id, nome, email }, servicos: [{ servicoId, nome, precoUnitario, quantidade, subtotal }], itens: [{ itemEstoqueId, nome, precoUnitario, quantidade, subtotal }], valorServicos, valorPecas, valorTotal }` |
| `CancelarOrcamento` | `oficina-billing-commands` | `{ motivo }` — cancela o orçamento e expira o link de pagamento, se existir; se o orçamento já estiver pago, estorna e responde `PagamentoEstornado` |
| `EstornarPagamento` | `oficina-billing-commands` | `{ motivo }` — estorna o pagamento aprovado da OS |

Os itens e preços de `GerarOrcamento` são os snapshots das linhas da OS (`nomeSnapshot`, `precoUnitario`, `subtotal`), então o Billing não precisa consultar o catálogo. `cliente.email` pode ser `null`, porque o cadastro não exige e-mail; nesse caso nenhum e-mail é enviado, e o cliente vê o orçamento e o link de pagamento pela API do Billing.

### Respostas (serviços → OS, fila `oficina-os-saga-replies`)

| Tipo | Publica | `payload` |
|---|---|---|
| `DiagnosticoIniciado` | Execution | `{ iniciadoEm }` |
| `DiagnosticoConcluido` | Execution | `{ concluidoEm }` |
| `OrcamentoEnviado` | Billing | `{ orcamentoId, valorTotal }` |
| `GeracaoOrcamentoFalhou` | Billing | `{ motivo }` — por exemplo `"ORCAMENTO_VAZIO"`, quando a OS não tem nenhum serviço nem item |
| `OrcamentoAprovado` | Billing | `{ orcamentoId, origem: "CLIENTE" \| "SISTEMA_EXTERNO" }` |
| `OrcamentoRecusado` | Billing | `{ orcamentoId, origem: "CLIENTE" \| "SISTEMA_EXTERNO", motivo }` |
| `PagamentoConfirmado` | Billing | `{ pagamentoId, valor, pagoEm }` — `pagamentoId` é o id do pagamento no Mercado Pago |
| `PagamentoRecusado` | Billing | `{ detalhe }` — o `status_detail` do Mercado Pago, por exemplo `cc_rejected_other_reason` |
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
| `EM_DIAGNOSTICO` | `DiagnosticoConcluido` | **trava as linhas da OS** e publica `GerarOrcamento` com os snapshots | `EM_DIAGNOSTICO` |
| `EM_DIAGNOSTICO` | `OrcamentoEnviado` | — | `AGUARDANDO_APROVACAO` |
| `EM_DIAGNOSTICO` | `GeracaoOrcamentoFalhou` | **compensa:** devolve o estoque | `CANCELADA` |
| `AGUARDANDO_APROVACAO` | `OrcamentoAprovado` | — | `AGUARDANDO_PAGAMENTO` |
| `AGUARDANDO_APROVACAO` | `OrcamentoRecusado` | **compensa:** devolve o estoque | `CANCELADA` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoConfirmado` | publica `IniciarReparo` | `EM_EXECUCAO` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoRecusado` | **compensa:** publica `CancelarOrcamento` e devolve o estoque | `CANCELADA` |
| `AGUARDANDO_APROVACAO` ou `AGUARDANDO_PAGAMENTO` | Cancelamento pelo funcionário (REST) | **compensa:** publica `CancelarOrcamento` e devolve o estoque | `CANCELADA` |
| `EM_EXECUCAO` | `ReparoConcluido` | envia o e-mail de finalização (Lambda `/mail`) | `FINALIZADA` |
| `EM_EXECUCAO` | `ExecucaoFalhou` (`REPARO`) | **compensa:** publica `EstornarPagamento` e devolve o estoque | `CANCELADA` |
| `RECEBIDA` ou `EM_DIAGNOSTICO` | `ExecucaoFalhou` (`DIAGNOSTICO`) | **compensa:** devolve o estoque, se algo foi lançado | `CANCELADA` |
| `CANCELADA` | `PagamentoConfirmado` (pago durante o cancelamento) | descarta; o Billing estorna ao processar `CancelarOrcamento` | `CANCELADA` |
| `CANCELADA` | `PagamentoEstornado` | registra no histórico da OS | `CANCELADA` |
| `FINALIZADA` | Entrega (REST, funcionário) | envia o e-mail de entrega | `ENTREGUE` (fim) |

Toda passagem para `CANCELADA` grava o motivo. Se um pagamento aprovado chegar ao Billing depois de `CancelarOrcamento`, ou se `CancelarOrcamento` chegar a um orçamento já pago, o próprio Billing estorna e publica `PagamentoEstornado`. Assim, nenhuma OS cancelada fica com dinheiro retido.

Regras que acompanham a tabela:

- **Linhas travadas depois do diagnóstico.** Serviços e itens podem ser lançados em `RECEBIDA` e em `EM_DIAGNOSTICO` até chegar `DiagnosticoConcluido`. A partir daí ficam travados, porque o orçamento foi gerado com aquela cópia; editar depois faria o cliente aprovar e pagar um valor diferente do total da OS. Isso substitui a regra atual (`garantirOSMutavel`), que permite editar também em `AGUARDANDO_APROVACAO`.
- **Cancelamento.** Nos status em que o mecânico atua (`RECEBIDA`, `EM_DIAGNOSTICO` e `EM_EXECUCAO`), a OS é cancelada pela rota `falhar` do Execution, que gera `ExecucaoFalhou`. Nos dois status em que a OS espera o cliente (`AGUARDANDO_APROVACAO` e `AGUARDANDO_PAGAMENTO`), quem cancela é o funcionário, pela rota do OS.
- **Histórico.** Toda transição grava em `HistoricoStatusOS`, que exige um `usuarioId`. Nas transições disparadas pela Saga vale o padrão do ADR-001: o `usuarioId` é o `usuarioCriadorId` da OS e a `observacao` identifica o ator real, por exemplo "Billing: orçamento aprovado pelo cliente" ou "…pelo sistema externo", a partir do campo `origem`.
- **Sem expiração automática.** O link de pagamento tem prazo no Mercado Pago, e depois dele o cliente não consegue pagar. O Mercado Pago não avisa quando um link expira, então uma OS parada esperando o cliente (aprovação ou pagamento) é cancelada pelo funcionário, com as mesmas compensações.

## 7. APIs REST

Todos os serviços validam o mesmo JWT (segredo `JWT_SECRET` do SSM):

- **funcionário:** `{ sub, email }`, emitido por `POST /auth/login` do OS Service;
- **cliente:** `{ sub, tipo: "cliente", cpf, nome }`, emitido pela Lambda de auth. O cliente só acessa o que é dele: o `sub` do token precisa bater com o `clienteId` da OS ou do orçamento.

Health e Swagger: o OS mantém `/health` e `/api`; Billing e Execution usam o próprio prefixo (`/billing/health`, `/billing/api`, `/execution/health`, `/execution/api`). No Ingress, o OS fica com as rotas sem prefixo, e `/billing` e `/execution` vão para os serviços novos.

### OS Service (mantém as rotas atuais)

- **Continuam:** `/auth/login`, `/cliente`, `/veiculos`, `/servicos`, `/itens-estoque`, `/user`, `/ordens-servico` (abertura, consulta, linhas de serviço e itens), `/ordens-servico/minhas` (consulta do cliente), `/public/ordens-servico/{codigo}` e `/ordens-servico/relatorios/...`.
- **Saem para o Billing:** `POST /ordens-servico/{id}/enviar-orcamento` (vira automático pela Saga), `POST /ordens-servico/minhas/{id}/aprovar`, `POST /ordens-servico/minhas/{id}/rejeitar` e `POST /webhooks/orcamento`.
- **Mudam:**
  - `POST /ordens-servico/{id}/transicao-status` passa a aceitar só `FINALIZADA → ENTREGUE`.
  - Lançar e alterar serviços e itens (`/ordens-servico/{id}/servicos` e `/itens-estoque`) só até o `DiagnosticoConcluido`, como diz a seção 6.
  - `DELETE /ordens-servico/{id}` passa a aceitar só OS `CANCELADA`. Excluir uma OS no meio da Saga deixaria orçamento, pagamento e tarefas órfãos nos outros serviços.
- **Novas:**
  - `POST /ordens-servico/{id}/cancelar` (funcionário), com `{ motivo }`. Só em `AGUARDANDO_APROVACAO` e `AGUARDANDO_PAGAMENTO`; dispara as compensações da seção 6.
  - `POST /internal/clientes/busca`, com `{ cpf }` no corpo e protegida pelo header `x-internal-token`. Devolve `{ id, nome, status }` para a Lambda de auth, que deixa de ler o banco. É `POST`, e não `GET`, para o CPF não aparecer na URL, que vai para os logs. A rota passa pelo mesmo ALB que o API Gateway alcança, então a proteção dela é o token, guardado no SSM.

### Billing Service (prefixo `/billing`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /billing/orcamentos?osId={osId}` | funcionário ou cliente dono | Lista os orçamentos da OS |
| `GET /billing/orcamentos/{id}` | funcionário ou cliente dono | Consulta um orçamento; depois da aprovação, inclui o `linkPagamento` |
| `POST /billing/orcamentos/{id}/aprovar` | cliente dono | Aprova, cria a preferência no Mercado Pago (`external_reference` = id do orçamento) e devolve `{ linkPagamento }`, também enviado por e-mail. Se o Mercado Pago falhar, responde 503 e nada muda: o orçamento continua aguardando aprovação e nenhuma mensagem é publicada |
| `POST /billing/orcamentos/{id}/recusar` | cliente dono | Recusa o orçamento, com `{ motivo }` opcional |
| `POST /billing/webhooks/orcamento` | sistema externo (`x-webhook-token`) | **Aprovação externa, que continua existindo.** Corpo no mesmo formato do webhook atual do OS, `{ codigoOS, aprovado, motivo? }`; só a URL muda. Na aprovação, o link de pagamento é criado e enviado ao cliente por e-mail; se o Mercado Pago falhar, responde 503 para o sistema externo tentar de novo |
| `POST /billing/webhooks/mercado-pago` | Mercado Pago (público) | Recebe o aviso e confirma consultando `GET /v1/payments/{id}`; nunca confia só no conteúdo do aviso. Ignora avisos que não sejam do tópico `payment` e é idempotente pelo id do pagamento, porque o Mercado Pago repete avisos |
| `GET /billing/pagamentos?osId={osId}` | funcionário | Pagamento e estorno da OS |

### Execution Service (prefixo `/execution`)

| Método e rota | Quem chama | O que faz |
|---|---|---|
| `GET /execution/tarefas?status=PENDENTE&tipo=DIAGNOSTICO` | funcionário | A fila: lista as tarefas filtradas por status (`PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDA`, `FALHOU`), tipo (`DIAGNOSTICO`, `REPARO`) ou `osId`, mais antigas primeiro |
| `GET /execution/tarefas/{id}` | funcionário | Consulta uma tarefa |
| `POST /execution/tarefas/{id}/iniciar` | funcionário | Inicia a tarefa (no diagnóstico, publica `DiagnosticoIniciado`) |
| `POST /execution/tarefas/{id}/concluir` | funcionário | Conclui a tarefa (publica `DiagnosticoConcluido` ou `ReparoConcluido`) |
| `POST /execution/tarefas/{id}/falhar` | funcionário | Registra a falha com `{ motivo }` (publica `ExecucaoFalhou`) |

Ciclo de uma tarefa: `PENDENTE` → `EM_ANDAMENTO` → `CONCLUIDA`, ou `FALHOU` a partir de `PENDENTE` ou `EM_ANDAMENTO`. Ação fora dessa ordem (por exemplo, falhar uma tarefa já concluída) responde 409 e não publica nada; isso evita um `ExecucaoFalhou` cancelar uma OS que já passou daquela etapa. Os comandos também são idempotentes por OS e tipo: um segundo `IniciarDiagnostico` para a mesma OS não cria outra tarefa.

## 8. O que cada serviço guarda

| Serviço | Banco | Dados próprios | Cópias recebidas por mensagem |
|---|---|---|---|
| OS | PostgreSQL | Clientes, veículos, usuários, catálogo, estoque, OS, linhas, histórico e estado da saga | — |
| Billing | PostgreSQL próprio | Orçamentos, pagamentos e estornos | Cliente (id, nome, e-mail) e linhas do orçamento, vindos de `GerarOrcamento` |
| Execution | DynamoDB | Tarefas de diagnóstico e reparo | Código da OS, veículo e itens a executar, vindos dos comandos |
