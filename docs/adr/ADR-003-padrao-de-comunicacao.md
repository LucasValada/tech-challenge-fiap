# ADR-003 — Padrão de comunicação entre os componentes

| | |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |
| **Relacionados** | [RFC-001 — Estratégia de autenticação](../rfc/RFC-001-estrategia-autenticacao.md), [RFC-002 — Escolha da nuvem](../rfc/RFC-002-escolha-da-nuvem.md) |

## Contexto

A solução tem vários componentes que precisam se comunicar: o cliente/funcionário, o **API Gateway**, a **Lambda de autenticação**, a **Lambda de notificações** (e-mail), a **aplicação** (EKS), o **banco** (RDS) e um **sistema externo** de aprovação de orçamento. É preciso definir **como** eles conversam — protocolo, acoplamento e (a)sincronismo — para manter a solução simples e previsível no escopo da fase.

## Decisão

Adotar **comunicação síncrona via HTTP/REST, stateless com JWT**, como padrão principal, e integrações desacopladas nas bordas:

1. **Cliente/Funcionário → aplicação:** REST/JSON sobre o **API Gateway** (HTTP API v2). Rotas protegidas exigem **JWT** (Bearer). Stateless: cada requisição carrega o token; a aplicação não guarda sessão.
2. **Autenticação (Lambda) desacoplada por segredo compartilhado:** a aplicação **não chama** a Lambda. A Lambda emite o JWT (HS256) e a aplicação apenas **valida** com o **mesmo segredo** (via SSM). Comunicação indireta, sem chamada de rede entre eles — reduz acoplamento e latência. (Detalhe em [RFC-001](../rfc/RFC-001-estrategia-autenticacao.md).)
3. **Aplicação → banco (RDS):** SQL sobre **TCP 5432 com TLS**, via Prisma (pool `pg`), dentro da VPC.
4. **Sistema externo → aplicação (webhook):** REST **inbound** (`POST /webhooks/orcamento`) autenticado por **token compartilhado** (`X-Webhook-Token`, comparado com `timingSafeEqual`). Integração máquina-a-máquina para a decisão de orçamento.
5. **Aplicação → Lambda de notificações (e-mail):** a aplicação faz um **POST HTTP** autenticado (`x-mail-api-token`) para a **Lambda de e-mail** (rota `/mail` do API Gateway), que encapsula o SMTP. O SMTP saiu do app — trocar o provedor de e-mail não toca no código nem no deploy da aplicação. Envio **best-effort** (com timeout de 15s): a falha é registrada em log e **não bloqueia** a transição de status da OS.

**Não** adotamos um message broker (SNS/SQS/RabbitMQ) para o fluxo atual: no volume e no escopo da fase, o custo de operar mensageria não se paga; a chamada síncrona à Lambda de e-mail é suficiente e mais simples de observar/depurar.

## Consequências

### Positivas
- **Simplicidade e observabilidade:** um único estilo (REST/JSON) para o tráfego de entrada, fácil de testar (curl/Swagger), logar (JSON + correlation id) e depurar.
- **Stateless:** qualquer réplica atende qualquer requisição (casa com o HPA e o balanceamento pelo ALB), sem afinidade de sessão.
- **Baixo acoplamento na autenticação:** trocar a Lambda por outro emissor não muda a aplicação, desde que o formato do token e o segredo se mantenham.

### Negativas / trade-offs
- **Acoplamento temporal (síncrono):** o cliente espera a resposta; uma dependência lenta (banco) reflete na latência. Mitigado por readiness/timeouts e pelo piso de réplicas.
- **Notificação serverless, porém síncrona:** o SMTP foi **isolado numa Lambda** (trocar o provedor de e-mail não toca no app), mas a chamada app→Lambda é HTTP síncrona e **best-effort** — pode falhar silenciosamente (só o log registra), escolha consciente para não travar a OS. A evolução para **notificação assíncrona por evento** (fila/tópico → função, com entrega garantida) é uma frente separada.
- **Webhook por token estático** é simples, mas menos robusto que assinatura por HMAC/rotação — aceitável para o escopo; endurecível depois.
