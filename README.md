# Tech Challenge FIAP - SOAT Oficina — OS Service

Sistema de gerenciamento de oficina mecânica desenvolvido para o Tech Challenge FIAP SOAT. Na **Fase 4**, a aplicação foi dividida em três microsserviços, e este repositório é o **OS Service**: abertura, status e histórico das ordens de serviço, clientes, veículos, catálogo e estoque, e o **orquestrador da Saga** que coordena o Billing e o Execution (ver [Fase 4: microsserviços e Saga](#fase-4-microsserviços-e-saga)). As seções seguintes, da Fase 3, descrevem a plataforma na AWS e o interior desta API, atualizadas para a Fase 4.

A API cobre a gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com **autenticação dupla** (funcionário por email/senha e cliente por **CPF via função serverless**), envio de orçamento por email, acompanhamento público de OS e observabilidade (health, logs JSON com correlação). Roda na **AWS** — **EKS** (Kubernetes gerenciado), **RDS PostgreSQL** (banco gerenciado), imagem no **ECR**, segredos no **SSM**, com um **API Gateway** na frente (roteando a autenticação e as notificações para **Lambdas serverless** e as rotas protegidas para o **ALB → EKS**) — tudo provisionado via **Terraform** e entregue por **CI/CD com deploy automático**.
## Índice

- [Fase 4: microsserviços e Saga](#fase-4-microsserviços-e-saga)
  - [Diagrama geral](#diagrama-geral)
  - [Por que esta divisão](#por-que-esta-divisão)
  - [Saga orquestrada](#saga-orquestrada)
  - [Ciclo da OS](#ciclo-da-os)
  - [Caminho feliz](#caminho-feliz)
  - [Transições e compensações](#transições-e-compensações)
  - [Garantias](#garantias)
  - [Rastreamento distribuído](#rastreamento-distribuído)
  - [Rota interna da Lambda de autenticação](#rota-interna-da-lambda-de-autenticação)
  - [Teste de integração dos três serviços](#teste-de-integração-dos-três-serviços)
- [Objetivos](#objetivos)
- [Solução em 4 repositórios](#solução-em-4-repositórios)
- [Vídeo demonstrativo](#vídeo-demonstrativo)
- [Clean Architecture (interno da API)](#clean-architecture-interno-da-api)
- [Arquitetura](#arquitetura)
  - [Diagrama de Componentes — visão de nuvem](#diagrama-de-componentes--visão-de-nuvem)
  - [Componentes da aplicação (C4)](#componentes-da-aplicação-c4)
  - [Infraestrutura provisionada na AWS](#infraestrutura-provisionada-na-aws)
  - [Fluxo de deploy (CI/CD)](#fluxo-de-deploy-cicd)
- [Justificativa do banco de dados](#justificativa-do-banco-de-dados)
- [Modelo de dados (Diagrama ER)](#modelo-de-dados-diagrama-er)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Execução local (Docker Compose)](#execução-local-docker-compose)
- [Execução local (desenvolvimento)](#execução-local-desenvolvimento)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Notificações por e-mail (Lambda)](#notificações-por-e-mail-lambda)
- [Autenticação](#autenticação)
- [Documentação da API](#documentação-da-api)
- [Documentação de arquitetura (RFCs e ADRs)](#documentação-de-arquitetura-rfcs-e-adrs)
- [Endpoints da API](#endpoints-da-api)
- [Fluxo da Ordem de Serviço](#fluxo-da-ordem-de-serviço)
- [Observabilidade](#observabilidade)
- [Testes](#testes)
- [Scripts disponíveis](#scripts-disponíveis)
- [Infraestrutura e deploy na AWS (EKS)](#infraestrutura-e-deploy-na-aws-eks)

## Fase 4: microsserviços e Saga

Na Fase 4 a oficina foi dividida em **três microsserviços independentes**, cada um com repositório, banco e infraestrutura próprios. Este repositório é o **OS Service**, que também é o **orquestrador da Saga**. Os contratos entre os serviços (filas, mensagens, transições e rotas) estão em [`docs/contratos.md`](docs/contratos.md).

| Serviço | Repositório | Responsabilidade | Banco |
|---|---|---|---|
| **OS Service** (este) | [`tech-challenge-fiap`](https://github.com/LucasValada/tech-challenge-fiap) | Abertura, status e histórico da OS; clientes, veículos, catálogo e estoque; **orquestra a Saga** | PostgreSQL (RDS) |
| **Billing Service** | [`oficina-billing-service`](https://github.com/fiap-soat-oficina-tech-challenge/oficina-billing-service) | Orçamento, aprovação (cliente ou sistema externo), pagamento no Mercado Pago (Checkout Pro) e estorno | PostgreSQL (RDS próprio) |
| **Execution Service** | [`oficina-execution-service`](https://github.com/fiap-soat-oficina-tech-challenge/oficina-execution-service) | Fila de diagnóstico e reparo do mecânico | DynamoDB |

A plataforma da Fase 3 continua: VPC e EKS ([`tc3-infra-k8s`](https://github.com/tiagostorch/tc3-infra-k8s)), o RDS do OS ([`tc3-infra-db`](https://github.com/tiagostorch/tc3-infra-db)) e o API Gateway com as Lambdas de autenticação e de e-mail ([`tc3-auth-lambda`](https://github.com/tiagostorch/tc3-auth-lambda)). Os três serviços rodam no mesmo cluster, cada um no seu namespace, atrás do mesmo ALB.

### Diagrama geral

```mermaid
graph TB
    Cliente["Cliente / Funcionário / Mecânico"]
    Externo["Sistema externo<br/>(aprovação de orçamento)"]
    MP["Mercado Pago<br/>(Checkout Pro)"]

    subgraph AWS["AWS"]
        GW["API Gateway<br/>/auth · /mail → Lambdas<br/>/#123;proxy+#125; → ALB"]
        LAuth["Lambda auth (CPF)"]
        LMail["Lambda e-mail"]
        ALB["ALB compartilhado<br/>/ → OS · /billing → Billing · /execution → Execution"]

        subgraph EKS["EKS"]
            OS["<b>OS Service</b><br/>orquestrador da Saga"]
            BI["<b>Billing Service</b>"]
            EX["<b>Execution Service</b>"]
        end

        subgraph SQS["Amazon SQS (cada fila com DLQ)"]
            QR[["oficina-os-saga-replies"]]
            QB[["oficina-billing-commands"]]
            QE[["oficina-execution-commands"]]
        end

        DBOS[("PostgreSQL<br/>OS")]
        DBBI[("PostgreSQL<br/>Billing")]
        DDB[("DynamoDB<br/>tarefas")]
    end

    Cliente --> GW
    Externo --> GW
    GW --> LAuth
    GW --> LMail
    GW --> ALB
    ALB --> OS
    ALB --> BI
    ALB --> EX
    LAuth -->|"POST /internal/clientes/busca"| ALB

    OS -->|"comandos"| QB
    OS -->|"comandos"| QE
    QB --> BI
    QE --> EX
    BI -->|"respostas"| QR
    EX -->|"respostas"| QR
    QR --> OS

    OS --- DBOS
    BI --- DBBI
    EX --- DDB
    BI -->|"preferência · consulta · estorno"| MP
    MP -->|"aviso de pagamento (webhook)"| BI
    OS -->|"e-mail"| LMail
    BI -->|"e-mail"| LMail
```

Nenhum serviço acessa o banco de outro. O que um precisa saber do outro chega numa mensagem, como cópia, ou por uma chamada REST.

### Por que esta divisão

A divisão segue a sugerida pelo enunciado e separa as áreas que mudam por motivos diferentes:

- **OS Service:** fica com o que o atendimento usa. Abertura, status e histórico da OS, e também clientes, veículos, catálogo de serviços e estoque, que são consultados e alterados junto com a OS (a baixa de estoque acontece ao lançar o item). Separar o estoque criaria mais uma Saga sem ganho para o desafio.
- **Billing Service:** concentra o dinheiro (orçamento, aprovação, pagamento e estorno) e a integração com o Mercado Pago. Uma falha do Mercado Pago não derruba a abertura nem a execução de OS.
- **Execution Service:** isola a fila do mecânico, que tem outro ritmo e outro formato de dado (tarefas autocontidas, lidas por status). É o lugar natural do banco NoSQL.

Tecnologias: os três usam NestJS e TypeScript, a mesma stack da Fase 3, então o grupo reaproveita o padrão de módulos, os testes e a observabilidade. Mensageria em **Amazon SQS**: gerenciado, já na conta, com DLQ e entrega "pelo menos uma vez", que os consumidores tratam com idempotência. **PostgreSQL** onde há transação e dinheiro (OS e Billing) e **DynamoDB** onde os dados são documentos por chave (Execution).

### Saga orquestrada

A Saga é **orquestrada**: o OS Service é o orquestrador central. Ele publica um comando para o serviço da etapa (fila de comandos dele) e reage à resposta (fila `oficina-os-saga-replies`). Billing e Execution nunca falam entre si.

**Por que orquestrada, e não coreografada:**

- **O fluxo tem dono.** A OS já é a entidade que atravessa todas as etapas e guarda o status e o histórico. Com o orquestrador, a sequência e as compensações ficam num lugar só ([`ProcessarRespostaSagaUseCase`](src/modules/ordem-servico/application/use-case/processar-resposta-saga.use-case.ts)), em vez de espalhadas por reações em três serviços.
- **Compensações explícitas.** Cada falha tem uma linha na tabela de transições com a compensação correspondente. Na coreografia, descobrir quem compensa o quê exige ler os três serviços.
- **Menos acoplamento entre os participantes.** Billing e Execution só conhecem os próprios comandos e a fila de respostas. Não precisam saber da existência um do outro.
- **Rastreamento simples.** Toda mensagem nasce ou termina no OS, com o `correlationId` da OS.

O custo é o orquestrador concentrar a lógica do fluxo. Com três serviços e um fluxo linear, esse custo é pequeno.

### Ciclo da OS

```mermaid
stateDiagram-v2
    [*] --> RECEBIDA: abertura (publica IniciarDiagnostico)
    RECEBIDA --> EM_DIAGNOSTICO: DiagnosticoIniciado
    EM_DIAGNOSTICO --> AGUARDANDO_APROVACAO: OrcamentoEnviado
    AGUARDANDO_APROVACAO --> AGUARDANDO_PAGAMENTO: OrcamentoAprovado
    AGUARDANDO_PAGAMENTO --> EM_EXECUCAO: PagamentoConfirmado (publica IniciarReparo)
    EM_EXECUCAO --> FINALIZADA: ReparoConcluido
    FINALIZADA --> ENTREGUE: entrega (API)

    RECEBIDA --> CANCELADA: ExecucaoFalhou (diagnóstico)
    EM_DIAGNOSTICO --> CANCELADA: ExecucaoFalhou (diagnóstico) ou GeracaoOrcamentoFalhou
    AGUARDANDO_APROVACAO --> CANCELADA: OrcamentoRecusado ou cancelamento pelo funcionário
    AGUARDANDO_PAGAMENTO --> CANCELADA: cancelamento pelo funcionário
    EM_EXECUCAO --> CANCELADA: ExecucaoFalhou (reparo)
    ENTREGUE --> [*]
    CANCELADA --> [*]
```

Toda passagem para `CANCELADA` é uma compensação: devolve o estoque e grava o motivo. Um pagamento recusado **não** cancela a OS: o link do Mercado Pago continua valendo, e o cliente pode tentar de novo.

### Caminho feliz

```mermaid
sequenceDiagram
    actor F as Funcionário
    actor M as Mecânico
    actor C as Cliente
    participant OS as OS Service
    participant EX as Execution
    participant BI as Billing
    participant MP as Mercado Pago

    F->>OS: POST /ordens-servico
    OS-)EX: IniciarDiagnostico
    M->>EX: iniciar diagnóstico
    EX-)OS: DiagnosticoIniciado → EM_DIAGNOSTICO
    M->>OS: lança serviços e itens (baixa de estoque)
    M->>EX: concluir diagnóstico
    EX-)OS: DiagnosticoConcluido (trava as linhas)
    OS-)BI: GerarOrcamento (cópia das linhas e preços)
    BI-)OS: OrcamentoEnviado → AGUARDANDO_APROVACAO
    C->>BI: POST /billing/orcamentos/{id}/aprovar
    BI->>MP: cria o link de pagamento
    BI-)OS: OrcamentoAprovado → AGUARDANDO_PAGAMENTO
    C->>MP: paga pelo link
    MP->>BI: aviso (webhook) · BI confirma em GET /v1/payments/{id}
    BI-)OS: PagamentoConfirmado → EM_EXECUCAO
    OS-)EX: IniciarReparo
    M->>EX: iniciar e concluir reparo
    EX-)OS: ReparoConcluido → FINALIZADA (e-mail ao cliente)
    F->>OS: entrega → ENTREGUE
```

### Transições e compensações

O que o orquestrador faz ao receber cada resposta (`docs/contratos.md`, seção 6):

| Status da OS | Evento | O OS faz | Novo status |
|---|---|---|---|
| — | Abertura (REST) | publica `IniciarDiagnostico` | `RECEBIDA` |
| `RECEBIDA` | `DiagnosticoIniciado` | — | `EM_DIAGNOSTICO` |
| `EM_DIAGNOSTICO` | `DiagnosticoConcluido` | trava as linhas e publica `GerarOrcamento` | `EM_DIAGNOSTICO` |
| `EM_DIAGNOSTICO` | `OrcamentoEnviado` | — | `AGUARDANDO_APROVACAO` |
| `EM_DIAGNOSTICO` | `GeracaoOrcamentoFalhou` | **compensa:** devolve o estoque | `CANCELADA` |
| `AGUARDANDO_APROVACAO` | `OrcamentoAprovado` | — | `AGUARDANDO_PAGAMENTO` |
| `AGUARDANDO_APROVACAO` | `OrcamentoRecusado` | **compensa:** devolve o estoque | `CANCELADA` |
| `AGUARDANDO_APROVACAO` ou `AGUARDANDO_PAGAMENTO` | Cancelamento pelo funcionário (REST) | **compensa:** publica `CancelarOrcamento` (o Billing expira o link e estorna, se houver pagamento) e devolve o estoque | `CANCELADA` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoRecusado` | registra no histórico; o cliente tenta de novo | `AGUARDANDO_PAGAMENTO` |
| `AGUARDANDO_PAGAMENTO` | `PagamentoConfirmado` | publica `IniciarReparo` | `EM_EXECUCAO` |
| `EM_EXECUCAO` | `ReparoConcluido` | e-mail de finalização | `FINALIZADA` |
| `RECEBIDA` ou `EM_DIAGNOSTICO` | `ExecucaoFalhou` (diagnóstico) | **compensa:** devolve o estoque | `CANCELADA` |
| `EM_EXECUCAO` | `ExecucaoFalhou` (reparo) | **compensa:** publica `EstornarPagamento` e devolve o estoque | `CANCELADA` |
| `CANCELADA` | `PagamentoEstornado` | registra no histórico | `CANCELADA` |
| `FINALIZADA` | Entrega (REST) | e-mail de entrega | `ENTREGUE` |

Uma resposta em outro status (repetida ou atrasada) é descartada com um aviso no log. Se o cliente pagar enquanto a OS é cancelada, o `PagamentoConfirmado` é descartado aqui, e o Billing estorna ao processar o `CancelarOrcamento`. Nenhuma OS cancelada fica com dinheiro retido.

### Garantias

- **Idempotência pelo estado.** O SQS entrega cada mensagem pelo menos uma vez. Cada resposta só vale num status, e a transição grava com o status lido no filtro (`UPDATE ... WHERE status = <lido>`). Uma resposta repetida não muda nada, e uma corrida com outra ação devolve a mensagem para a fila. Não há tabela de mensagens processadas.
- **Gravar e publicar juntos.** O próximo comando é publicado **dentro** da transação do banco, antes do commit. Se a publicação falha, nada é gravado (a abertura da OS falha, ou a resposta volta para a fila). É a alternativa enxuta ao outbox transacional.
- **Linhas travadas.** Serviços e itens só podem ser lançados até o diagnóstico concluído, porque o orçamento é gerado com aquela cópia. Depois disso a edição responde 409, e a trava é conferida dentro da transação da edição.
- **Falha técnica vira nova tentativa.** Se o banco cai, a mensagem não é apagada: o SQS reenvia e, depois de 5 tentativas, a move para a DLQ `oficina-os-saga-replies-dlq`. Falha de negócio chega como resposta de falha e vira compensação.
- **Histórico com o ator real.** As transições da Saga usam o criador da OS como usuário (ADR-001) e dizem na observação quem agiu ("Billing: …", "Execution: …").

### Rastreamento distribuído

O `correlationId` nasce na abertura da OS: é o header `x-correlation-id` da requisição ou o id gerado pelo pino-http. Ele fica gravado na OS e vai em toda mensagem. Os três serviços escrevem esse id nos logs JSON ao consumir as mensagens, então **filtrar por `correlationId` no New Relic mostra o fluxo de uma OS nos três serviços**, como validado no fórum da disciplina. Ver [Observabilidade](#observabilidade).

### Rota interna da Lambda de autenticação

`POST /internal/clientes/busca` (CPF no corpo, header `x-internal-token`) devolve `{ id, nome, status }`. Com ela, a Lambda de autenticação por CPF deixa de ler o banco do OS. O token é gerado pelo [`terraform/ssm.tf`](terraform/ssm.tf) e guardado só no SSM. A troca na Lambda ([`tc3-auth-lambda`](https://github.com/tiagostorch/tc3-auth-lambda)) é feita na etapa de integração na AWS.

### Teste de integração dos três serviços

[`test/integracao/`](test/integracao/) sobe OS, Billing e Execution juntos com Docker Compose. As dependências são os dois PostgreSQL, o LocalStack (SQS e DynamoDB) e o simulador do Mercado Pago (WireMock). Depois, percorre a Saga só pelas APIs públicas:

```bash
cd test/integracao
BILLING_DIR=<repo do Billing> EXECUTION_DIR=<repo do Execution> \
  docker compose -p oficina-integracao up -d --build
bash teste-saga.sh
docker compose -p oficina-integracao down -v
```

São 45 verificações em quatro cenários:

1. o caminho feliz até a entrega, com uma tentativa de pagamento recusada antes da aprovada;
2. a falha no reparo com estorno;
3. o cancelamento pelo funcionário com o link expirado;
4. o mesmo `correlationId` nos logs dos três serviços.

### BDD do fluxo completo

O PDF pede pelo menos um fluxo completo testado com BDD, e o professor orientou que o cenário principal suba os três serviços juntos. A funcionalidade [`test/bdd/features/ordem-servico-completa.feature`](test/bdd/features/ordem-servico-completa.feature) descreve em Gherkin, em português, uma OS que vai da abertura à entrega:

1. o funcionário abre a OS e o estoque é baixado;
2. o Execution põe o diagnóstico na fila e o mecânico o conclui;
3. o Billing gera o orçamento com o total da OS e o cliente aprova;
4. o cliente recebe o link do Mercado Pago, que avisa o pagamento aprovado;
5. o Execution põe o reparo na fila e o mecânico o conclui;
6. o funcionário registra a entrega.

O histórico da OS precisa mostrar as sete etapas na ordem.

Os passos ([`test/bdd/steps/`](test/bdd/steps/)) chamam só as APIs públicas dos serviços, como fariam o funcionário, o mecânico, o cliente e o Mercado Pago. Cada etapa assíncrona da Saga é esperada consultando de novo até o valor aparecer, por até 30 s, sem pausa fixa. O cenário cria dados únicos (CPF, placa e SKU), então roda de novo no mesmo ambiente sem conflito. Ferramenta: [Cucumber](https://github.com/cucumber/cucumber-js), com os passos em TypeScript.

```bash
cd test/integracao
BILLING_DIR=<repo do Billing> EXECUTION_DIR=<repo do Execution> \
  docker compose -p oficina-integracao up -d --build --wait
cd ../..
BDD_JWT_SECRET=segredo-de-integracao npm run test:bdd   # relatório em test/bdd/relatorio/cucumber.html
```

`BDD_JWT_SECRET` é o `JWT_SECRET` dos serviços no compose: o cenário assina com ele o token do cliente, que em produção vem da Lambda de autenticação por CPF.

No CI, o job **BDD (três serviços)** do `ci.yml` faz o mesmo em todo PR: baixa o Billing e o Execution na branch de destino do PR, constrói os três, roda o cenário e publica o relatório HTML como artefato da execução. No push na `develop` e na `main`, o CD roda o mesmo `ci.yml` antes de publicar a imagem.

## Objetivos

- Substituir o controle manual por planilhas por um sistema integrado
- Permitir criação e acompanhamento de ordens de serviço com fluxo de status completo (RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → AGUARDANDO_PAGAMENTO → EM_EXECUCAO → FINALIZADA → ENTREGUE, ou CANCELADA por compensação)
- Gerar orçamentos automaticamente com base nos serviços e peças incluídos na OS (Billing, na Fase 4)
- Enviar orçamento ao cliente por email para aprovação e cobrar pelo Mercado Pago (Billing)
- Permitir que o cliente acompanhe a OS pela consulta pública e pelas rotas autenticadas por CPF
- Controlar estoque de peças e insumos com alerta de estoque mínimo
- Monitorar tempo médio de execução dos serviços
- Prover infraestrutura reprodutível via Terraform e Kubernetes, com deploy automatizado por pipeline CI/CD

## Solução em 4 repositórios

A Fase 3 exigiu a segregação da solução em **quatro repositórios git independentes**, cada um com seu próprio CI/CD e deploy automático para a nuvem. **Este repositório é o nº 4 (aplicação principal)**, que na Fase 4 virou o OS Service. Os repositórios 1 a 3 continuam como plataforma; o Billing e o Execution têm repositórios próprios (ver [Fase 4](#fase-4-microsserviços-e-saga)).

| # | Repositório | Papel | Stack |
|---|---|---|---|
| 1 | [`tc3-auth-lambda`](https://github.com/tiagostorch/tc3-auth-lambda) | **Duas** Functions Serverless no mesmo repo, atrás de um único **API Gateway**: **autenticação por CPF** (`POST /auth`) e **notificações por e-mail** (`POST /mail`) | AWS Lambda (Node), API Gateway HTTP v2, `pg`, `nodemailer` |
| 2 | [`tc3-infra-k8s`](https://github.com/tiagostorch/tc3-infra-k8s) | Terraform do **cluster EKS** (VPC, EKS, node group, ECR, ALB Controller, OIDC, budget) + observabilidade New Relic (agente, dashboard, alertas) | Terraform, módulos AWS |
| 3 | [`tc3-infra-db`](https://github.com/tiagostorch/tc3-infra-db) | Terraform do **RDS PostgreSQL** gerenciado (+ publicação dos segredos no SSM) | Terraform, RDS |
| 4 | [**`tech-challenge-fiap`**](https://github.com/LucasValada/tech-challenge-fiap) **(este repo)** | **Aplicação principal** NestJS rodando no EKS | NestJS 11, Prisma 7, PostgreSQL |

Os repositórios se integram por **rede privada (VPC)**, **SSM Parameter Store** (segredos compartilhados, incl. o `JWT_SECRET` que a Lambda e a app usam) e **`terraform_remote_state`**. Por que AWS e como cada peça se encaixa: ver **[RFC-002 — Escolha da nuvem](docs/rfc/RFC-002-escolha-da-nuvem.md)**.

## Vídeo demonstrativo

Vídeo (YouTube, até 15 minutos) cobrindo autenticação por CPF, execução do CI/CD, deploy automatizado, consumo das APIs protegidas, dashboard de monitoramento e logs/traces em execução.

**Link:** [https://youtu.be/P01Bz7Hop7w](https://youtu.be/P01Bz7Hop7w)

## Clean Architecture (interno da API)

Todos os módulos de negócio (`auth`, `cliente`, `mail`, `item-estoque`, `ordem-servico`, `servico`, `user`, `veiculo`) seguem o mesmo padrão de Clean Architecture em 4 camadas, garantindo separação de responsabilidades e inversão de dependências:

```
src/modules/<módulo>/
├── interface/          → Controllers (HTTP), validações de entrada (DTOs), guards
├── application/        → Use cases (1 arquivo = 1 responsabilidade), mappers de resposta
├── domain/             → Entities, Repository interfaces, Domain services puros
├── infra/              → Adaptadores específicos do módulo (ex.: BcryptPasswordHasher
│                         em auth/infra e user/infra, JwtTokenIssuer em auth/infra,
│                         NestMailerEmailSender em mail/infra)
└── <módulo>.module.ts  → Wire-up NestJS (providers, imports, exports)

src/infra/database/prisma/repositories/
                        → Prisma repositories centralizados, implementando as
                          Repository interfaces expostas por cada domínio
                          (usam o PrismaService de src/modules/prisma)
```

**Princípios aplicados:**

- **Inversão de dependência:** use cases dependem de `Repository` (interface no `domain`), nunca da implementação Prisma
- **Use case por classe:** cada use case é um `@Injectable` com um único método `execute()`
- **Domain services puros:** funções puras em `domain/services/` (ex.: `garantirCpfCnpjUnico`, `buscarClienteOuFalhar`) sem estado nem dependência de framework
- **Tokens de DI como string inline:** `@Inject('CLIENTE_REPOSITORY')` para desacoplar módulos
- **Snapshots imutáveis:** serviços e itens de estoque adicionados a uma OS ficam com nome e preço copiados no momento da inclusão, isolados de mudanças futuras no cadastro

## Arquitetura

Os diagramas desta seção mostram a plataforma na AWS e o interior do OS Service. A visão com os três serviços está no [Diagrama geral](#diagrama-geral).

### Diagrama de Componentes — visão de nuvem

Visão de alto nível de toda a solução na AWS: o cliente entra pelo **API Gateway**, que roteia a **autenticação** (`/auth`) e as **notificações** (`/mail`) para **Lambdas serverless** e as rotas protegidas para o **ALB → pods no EKS**; a aplicação e a Lambda de auth usam o **RDS** (banco gerenciado) e compartilham segredos pelo **SSM**; a imagem vem do **ECR**; a Lambda de e-mail cuida do SMTP; e a observabilidade (New Relic) coleta métricas, logs e traces.

```mermaid
graph TB
    Cliente["Cliente / Funcionário<br/>browser · curl · Postman"]
    Webhook["Sistema externo<br/>aprovação de orçamento<br/>(atendido pelo Billing na Fase 4)"]
    SMTP["SMTP<br/>Ethereal / SES<br/>(usado pela Lambda de e-mail)"]
    Obs["Observabilidade<br/>New Relic — métricas, APM,<br/>dashboards, alertas + logs JSON"]

    subgraph AWS["AWS · us-east-1"]
        GW["<b>API Gateway</b> (HTTP v2)<br/>POST /auth → Lambda auth<br/>POST /mail → Lambda e-mail<br/>ANY /#123;proxy+#125; → ALB (VPC Link)"]
        ECR["<b>ECR</b><br/>imagem da API"]
        SSM["<b>SSM Parameter Store</b><br/>JWT_SECRET, DATABASE_URL,<br/>MAIL_API_TOKEN (SecureString)"]

        subgraph VPC["VPC — subnets privadas"]
            LambdaAuth["<b>Lambda</b> — auth por CPF<br/>valida CPF · checa status · emite JWT"]
            LambdaMail["<b>Lambda</b> — notificações<br/>envia e-mail via SMTP"]
            ALB["<b>ALB</b> internet-facing<br/>Ingress via ALB Controller"]

            subgraph EKS["<b>EKS</b> — cluster Kubernetes"]
                Pods["Deployment oficina-api<br/>2–10 pods (HPA) em 2 AZs<br/>NestJS · /health · logs JSON"]
            end

            RDS[("<b>RDS PostgreSQL</b><br/>gerenciado · TLS · subnet privada")]
        end
    end

    Cliente -->|"HTTPS/REST + JWT"| GW
    GW -->|"POST /auth"| LambdaAuth
    GW -->|"POST /mail"| LambdaMail
    GW -->|"rotas protegidas (VPC Link)"| ALB
    ALB --> Pods
    LambdaAuth -->|"SELECT cliente (TLS)"| RDS
    Pods -->|"SQL/TLS 5432"| RDS
    Pods -->|"pull imagem"| ECR
    Pods -->|"lê segredos"| SSM
    LambdaAuth -->|"mesmo JWT_SECRET"| SSM
    Pods -->|"POST /mail — notificação (best-effort)"| GW
    LambdaMail -->|"envia e-mail"| SMTP
    LambdaMail -->|"lê token + SMTP"| SSM
    Webhook -->|"POST /billing/webhooks/orcamento"| ALB
    Pods -.->|"métricas · logs · traces"| Obs
```

### Componentes da aplicação (C4)

#### Nível Container

```mermaid
graph TB
    classDef person fill:#08427B,stroke:#052E56,color:#fff,font-weight:bold
    classDef external fill:#999999,stroke:#6B6B6B,color:#fff
    classDef container fill:#438DD5,stroke:#3B7BC0,color:#fff,font-weight:bold
    classDef database fill:#438DD5,stroke:#3B7BC0,color:#fff,font-weight:bold

    Clientes["<b>Clientes HTTP</b><br/><i>[Person]</i><br/>Consumo autenticado (Swagger UI,<br/>curl, Postman com JWT) ou público<br/>(código da OS + placa via<br/>/public/ordens-servico)"]

    subgraph Oficina["Sistema Oficina"]
        API["<b>Oficina API</b><br/><i>[Container: NestJS / Node]</i><br/>Gestão de OS, clientes, veículos,<br/>serviços e itens de estoque"]
        DB[("<b>PostgreSQL 17</b><br/><i>[ContainerDb: Banco relacional]</i><br/>Persistência via Prisma 7<br/>com pg driver adapter")]
    end

    subgraph Externos["Sistemas externos"]
        Saga["<b>Billing e Execution Services</b><br/><i>[Microsserviços da Fase 4]</i><br/>Recebem comandos e respondem<br/>pelas filas SQS da Saga"]
        MailLambda["<b>Lambda de Notificações</b><br/><i>[External System]</i><br/>Recebe POST /mail (via API Gateway)<br/>e envia e-mails de finalização<br/>e entrega via SMTP"]
    end

    Clientes -->|"HTTPS / REST<br/>JSON + JWT (privado) ou<br/>código+placa (público)"| API
    API -->|"comandos (Amazon SQS)"| Saga
    Saga -->|"respostas (Amazon SQS)"| API
    API -->|"reads/writes<br/>TCP 5432 via Prisma"| DB
    API -->|"POST /mail<br/>JSON + x-mail-api-token"| MailLambda

    class Clientes person
    class Saga,MailLambda external
    class API container
    class DB database
```

#### Nível Component

Zoom dentro do Container **Oficina API** mostrando as quatro camadas da Clean Architecture. As relações tracejadas rotuladas como **implementa** representam a inversão de dependência: os adapters de infra implementam interfaces expostas pelo domain, e não o contrário.

```mermaid
graph TB
    classDef person fill:#08427B,stroke:#052E56,color:#fff,font-weight:bold
    classDef external fill:#999999,stroke:#6B6B6B,color:#fff
    classDef database fill:#438DD5,stroke:#3B7BC0,color:#fff,font-weight:bold
    classDef component fill:#85BBF0,stroke:#5D82A8,color:#000

    Cliente["<b>Cliente HTTP</b><br/><i>[Person]</i><br/>Consumo autenticado ou público"]

    subgraph OficinaAPI["Oficina API — NestJS [Container]"]
        direction TB

        subgraph InterfaceLayer["Camada Interface — src/modules/&lt;m&gt;/interface"]
            direction LR
            Controllers["<b>Controllers + Guards</b><br/><i>[Component: NestJS Controller]</i><br/>JwtAuthGuard, InternalTokenGuard<br/>+ RespostasSagaConsumer (fila SQS)"]
            DTOs["<b>DTOs de entrada e resposta</b><br/><i>[Component: class-validator]</i><br/>Validação declarativa de payload"]
        end

        subgraph ApplicationLayer["Camada Application — src/modules/&lt;m&gt;/application"]
            direction LR
            UseCases["<b>Use Cases</b><br/><i>[Component: @Injectable NestJS]</i><br/>1 classe = 1 responsabilidade,<br/>método execute — inclui o<br/>orquestrador da Saga"]
            Mappers["<b>Mappers de resposta</b><br/><i>[Component: TypeScript]</i><br/>toUserResponse etc"]
            Shared["<b>Shared helpers</b><br/><i>[Component: TypeScript]</i><br/>traduzirErroDominio, etc"]
        end

        subgraph DomainLayer["Camada Domain — src/modules/&lt;m&gt;/domain"]
            direction LR
            Entities["<b>Entities</b><br/><i>[Component: Classes puras]</i><br/>OrdemServico, Cliente, Veiculo etc"]
            DomainSvc["<b>Domain Services</b><br/><i>[Component: Funções puras]</i><br/>garantirCpfCnpjUnico, buscarClienteOuFalhar,<br/>maquinaDeEstadosOS, calcularTotaisOS"]
            Repos["<b>Repository & Adapter Interfaces (ports)</b><br/><i>[Component: Contratos TS + Errors tipados]</i><br/>Cliente/Veiculo/OS/User Repository (persistência)<br/>+ EmailSender, PasswordHasher, TokenIssuer (adapters)"]
        end

        subgraph ModuleInfra["Adapters por módulo — src/modules/&lt;m&gt;/infra"]
            direction LR
            Bcrypt["<b>BcryptPasswordHasher</b><br/><i>[Component: bcrypt]</i><br/>auth/infra e user/infra"]
            Jwt["<b>JwtTokenIssuer</b><br/><i>[Component: @nestjs/jwt]</i><br/>auth/infra"]
            Mailer["<b>NestMailerEmailSender</b><br/><i>[Component: fetch → Lambda de e-mail]</i><br/>mail/infra, provider EMAIL_SENDER"]
        end

        subgraph SharedInfra["Infra compartilhada — src/infra e src/modules/prisma"]
            direction LR
            PrismaSvc["<b>PrismaService</b><br/><i>[Component: pg.Pool + PrismaPg adapter]</i><br/>Bootstrap do Prisma Client"]
            PrismaRepos["<b>Prisma Repositories</b><br/><i>[Component: Prisma Client 7]</i><br/>src/infra/database/prisma/repositories"]
            Publicador["<b>PublicadorComandosSqs</b><br/><i>[Component: AWS SDK v3]</i><br/>src/infra/mensageria"]
        end
    end

    subgraph Externos["Sistemas externos"]
        direction TB
        DB[("<b>PostgreSQL 17</b><br/><i>[ContainerDb: Banco relacional]</i>")]
        MailLambda["<b>Lambda de Notificações</b><br/><i>[External System]</i><br/>Envia e-mail via SMTP"]
        SQSExt["<b>Amazon SQS</b><br/><i>[External System]</i><br/>filas de comandos e de respostas"]
    end

    Cliente -->|"HTTPS / REST"| Controllers
    Controllers -->|"valida entrada"| DTOs
    Controllers -->|"invoca"| UseCases
    UseCases -->|"usa"| DomainSvc
    UseCases -->|"depende de contratos"| Repos
    UseCases -->|"usa"| Mappers
    UseCases -->|"usa"| Shared
    DomainSvc -->|"opera sobre"| Entities

    PrismaRepos -.->|"implementa"| Repos
    Publicador -.->|"implementa (PublicadorComandos)"| Repos
    Bcrypt -.->|"implementa (PasswordHasher)"| Repos
    Jwt -.->|"implementa (TokenIssuer)"| Repos
    Mailer -.->|"implementa (EmailSender)"| Repos

    PrismaRepos -->|"usa Prisma Client"| PrismaSvc
    PrismaSvc -->|"TCP 5432 / pg driver"| DB
    Mailer -->|"POST /mail (HTTP + token)"| MailLambda
    Publicador -->|"SendMessage"| SQSExt

    class Cliente person
    class DB database
    class MailLambda,SQSExt external
    class Controllers,DTOs,UseCases,Mappers,Shared,Entities,DomainSvc,Repos,Bcrypt,Jwt,Mailer,PrismaSvc,PrismaRepos,Publicador component
```

### Infraestrutura provisionada na AWS

Recursos do cluster (namespace `oficina`) e as dependências gerenciadas. Tudo declarado em Terraform (repos de infra) e nos manifestos `k8s/` deste repo; o Secret é montado do SSM pelo pipeline no deploy.

```mermaid
graph TB
    subgraph AWS["AWS · us-east-1 · Terraform"]
        subgraph VPC["VPC — 2 AZs (us-east-1a / 1b)"]
            subgraph EKS["EKS — namespace oficina"]
                Ingress["Ingress → ALB Controller<br/>ALB internet-facing, target-type ip"]
                Svc["Service ClusterIP :3000"]
                Deploy["Deployment oficina-api<br/>2–10 réplicas · topologySpread por AZ<br/>securityContext: non-root, drop ALL caps"]
                HPA["HPA min 2 / max 10<br/>CPU 70% · memória 80%"]
                PDB["PodDisruptionBudget<br/>minAvailable 1"]
                CM["ConfigMap app-config"]
                Sec["Secret app-secret"]
                Job["Job db-migration<br/>prisma migrate deploy"]
                MS["metrics-server (HPA)"]
            end
            RDS[("RDS PostgreSQL<br/>db.t4g.micro · subnet privada · TLS")]
        end
        ECR["ECR — imagem da API"]
        SSM["SSM /tc3-oficina/homolog/*<br/>DATABASE_URL · JWT_SECRET · MAIL_API_TOKEN<br/>INTERNAL_API_TOKEN · NEW_RELIC_LICENSE_KEY (SecureString)"]
        SQS["SQS — filas da Saga<br/>(terraform/ de cada serviço)"]
    end

    Ingress --> Svc --> Deploy
    HPA -.->|escala| Deploy
    PDB -.->|protege| Deploy
    Deploy -.->|envFrom| CM
    Deploy -.->|secretKeyRef| Sec
    Deploy -->|"SQL/TLS 5432"| RDS
    Deploy -->|pull imagem| ECR
    Deploy -->|"comandos e respostas"| SQS
    Sec -.->|sincronizado de| SSM
    Job -->|aplica migrations| RDS
    MS -.->|coleta métricas| Deploy
```

### Fluxo de deploy (CI/CD)

Dois workflows em `.github/workflows/`. `ci.yml` valida cada mudança; `cd.yml` empacota e faz o **deploy automático no EKS** a cada push em `develop`/`main` (ambas apontam para o mesmo ambiente único). Autenticação na AWS por **OIDC** (sem chave estática); actions pinadas por SHA.

```mermaid
graph LR
    Dev["Push/merge em<br/>develop ou main"]

    subgraph CI["ci.yml — Integration (push + PR)"]
        CIJob["Build & Test<br/>npm ci · prisma generate<br/>testes unitários · build"]
    end

    subgraph CD["cd.yml — Delivery (só push)"]
        Guard["1 · Test guard<br/>repete os testes"]
        Build["2 · Build & Push (ECR)<br/>OIDC · docker build linux/amd64<br/>push no ECR (tag = SHA)"]
        Deploy["3 · Deploy (EKS)<br/>update-kubeconfig<br/>Secret montado do SSM · configmap<br/>Job de migration (aguarda concluir)<br/>apply deployment/service/hpa/ingress/pdb<br/>rollout status + smoke test"]
        Guard --> Build --> Deploy
    end

    Dev --> CIJob
    Dev --> Guard
    Deploy --> EKSc["Cluster EKS<br/>aplicação atualizada e validada"]
```

> Diagnóstico em falha: se um step do deploy quebra, um passo `if: failure()` dumpa `kubectl get all`, `describe pods`, eventos e logs do namespace. O **smoke test** exercita, contra o app deployado, health/readiness, login, criação de cliente (com normalização de CPF), abertura de OS com baixa de estoque, consulta pública, 401 e HPA/réplicas.

## Justificativa do banco de dados

**PostgreSQL** foi escolhido por:

- **Integridade referencial:** o domínio possui múltiplas entidades com relacionamentos complexos (OS → Cliente, Veículo, Serviços, Itens, Histórico). O PostgreSQL garante consistência com foreign keys e transações ACID, essencial para operações atômicas como baixa de estoque ao adicionar itens na OS.
- **Tipos nativos:** suporte a `UUID`, `DECIMAL` (valores monetários), `ENUM` (status da OS, tipo de item) e `TIMESTAMP WITH TIME ZONE` sem necessidade de workarounds.
- **Desempenho em consultas analíticas:** o relatório de tempo médio de execução usa agregações que o PostgreSQL lida com eficiência.
- **Ecossistema maduro:** integração consolidada com Prisma 7 (via driver adapter `@prisma/adapter-pg`) e documentação abrangente.

Na Fase 3 o banco passou de Postgres-em-cluster para **RDS PostgreSQL gerenciado** (subnet privada, TLS obrigatório, backups e métricas geridos pela AWS), provisionado no repositório [`tc3-infra-db`](https://github.com/tiagostorch/tc3-infra-db). A modelagem também foi **melhorada** (campo `status` em `Cliente`, snapshots imutáveis nas linhas da OS, numeração sequencial anual e políticas de exclusão explícitas).

Na Fase 4 este PostgreSQL passou a ser **só do OS Service**. O Billing tem o próprio PostgreSQL e o Execution usa DynamoDB; nenhum serviço lê o banco de outro (ver [Fase 4](#fase-4-microsserviços-e-saga)).

> **Justificativa formal completa + ajustes no modelo relacional:** ver **[RFC-003 — Escolha do banco de dados](docs/rfc/RFC-003-escolha-do-banco.md)**.

## Modelo de dados (Diagrama ER)

O schema (Prisma, `prisma/schema.prisma`) tem **10 entidades** e **4 enums**. O diagrama abaixo mostra as entidades e seus relacionamentos.

```mermaid
erDiagram
    Usuario ||--o{ OrdemServico : "cria"
    Usuario ||--o{ HistoricoStatusOS : "registra"
    Cliente ||--o{ Veiculo : "possui"
    Cliente ||--o{ OrdemServico : "é dono"
    Veiculo ||--o{ OrdemServico : "atendido em"
    OrdemServico ||--o{ OSServicos : "contém"
    OrdemServico ||--o{ OSItemEstoque : "contém"
    OrdemServico ||--o{ HistoricoStatusOS : "tem histórico"
    Servicos ||--o{ OSServicos : "referenciado por"
    ItemEstoque ||--o{ OSItemEstoque : "referenciado por"

    Usuario {
        uuid id PK
        string email UK
        string senhaHash
    }
    Cliente {
        uuid id PK
        string cpfCnpj UK
        enum tipoPessoa "FISICA|JURIDICA"
        enum status "ATIVO|INATIVO"
    }
    Veiculo {
        uuid id PK
        uuid clienteId FK
        string placa UK
    }
    Servicos {
        uuid id PK
        decimal precoBase
        int tempoEstimadoMin
        bool ativo
    }
    ItemEstoque {
        uuid id PK
        string sku UK
        enum tipo "PECA|INSUMO"
        int quantidadeEstoque
        int estoqueMinimo
    }
    OrdemServico {
        uuid id PK
        string codigo UK
        uuid clienteId FK
        uuid veiculoId FK
        uuid usuarioCriadorId FK
        enum status "8 estados"
        decimal valorTotal
        string correlationId "fluxo da Saga"
        datetime diagnosticoConcluidoAt "trava as linhas"
        datetime canceladaAt
        string motivoCancelamento
    }
    OSServicos {
        uuid id PK
        uuid ordemServicoId FK
        uuid servicoId FK
        string nomeSnapshot
        decimal precoUnitario
        decimal subtotal
    }
    OSItemEstoque {
        uuid id PK
        uuid ordemServicoId FK
        uuid itemEstoqueId FK
        string nomeSnapshot
        decimal precoUnitario
        decimal subtotal
    }
    HistoricoStatusOS {
        uuid id PK
        uuid ordemServicoId FK
        uuid usuarioId FK
        enum status
    }
    OSCodigoCounter {
        int ano PK
        int contador
    }
```

**Explicação dos relacionamentos:**

- **Cliente 1—N Veículo** e **Cliente 1—N OrdemServico:** um cliente tem vários veículos e várias OS. `onDelete: Restrict` — não se apaga um cliente que ainda tem veículo/OS.
- **Veículo 1—N OrdemServico:** cada OS é para um veículo; um veículo pode ter várias OS ao longo do tempo (`Restrict`).
- **Usuário 1—N OrdemServico / HistoricoStatusOS:** o funcionário que cria a OS e o autor de cada transição de status. (Sobre o ator em ações de cliente, ver [ADR-001](docs/adr/ADR-001-ator-trilha-auditoria.md).)
- **OrdemServico 1—N OSServicos / OSItemEstoque:** as **linhas** da OS (serviços e peças). Guardam `nomeSnapshot`/`precoUnitario` congelados no momento da inclusão. `onDelete: Cascade` — apagar a OS remove suas linhas.
- **OrdemServico 1—N HistoricoStatusOS:** a trilha cronológica de status (`Cascade`), base do relatório de tempo médio por status.
- **Servicos / ItemEstoque 1—N linhas:** o catálogo referenciado pelas linhas (`Restrict` — não se apaga um serviço/item usado em alguma OS).
- **OSCodigoCounter:** tabela isolada (sem FK), um contador por ano para gerar `codigo` sequencial da OS de forma transacional.

## Stack

| Camada | Tecnologia |
|---|---|
| **Runtime / Framework** | Node.js 24 · NestJS 11 · TypeScript |
| **Persistência** | Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL 17 |
| **Autenticação** | JWT HS256 (Passport) · bcrypt · função serverless (Lambda) por CPF |
| **Notificações** | Função serverless (Lambda de e-mail via `/mail`) · envio best-effort por HTTP |
| **Observabilidade** | `nestjs-pino` (logs JSON + correlationId) · **New Relic** (APM, métricas customizadas, traces distribuídos, dashboards e alertas) · endpoints `/health` e `/health/ready` |
| **Container** | Docker (multi-stage, non-root) · Docker Compose (local) |
| **Nuvem (AWS)** | **EKS** (Kubernetes 1.3x) · **RDS PostgreSQL** · **Lambda + API Gateway** · **ECR** · **SSM** · **ALB** |
| **IaC / CI-CD** | Terraform · GitHub Actions (OIDC, deploy no EKS) |
| **Mensageria (Saga)** | Amazon SQS (AWS SDK v3) · LocalStack no ambiente local |
| **Testes** | Jest (unit) · Testcontainers (e2e com Postgres real) · Docker Compose com os três serviços (integração) |

## Pré-requisitos

**Desenvolvimento local:** Node.js 24+, npm 11+, Docker e Docker Compose.

**Para operar o deploy na AWS (EKS):** AWS CLI v2 (credenciais/OIDC), `kubectl`. O provisionamento da infraestrutura (VPC/EKS/RDS) fica nos repositórios de infra (Terraform) — ver [Solução em 4 repositórios](#solução-em-4-repositórios).

## Execução local (Docker Compose)

Forma recomendada para rodar a aplicação localmente (o deploy na nuvem é automatizado pelo CI/CD — ver [Infraestrutura e deploy na AWS](#infraestrutura-e-deploy-na-aws-eks)).

```bash
# 1. Clonar o repositório
git clone https://github.com/LucasValada/tech-challenge-fiap.git
cd tech-challenge-fiap

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (ver seção abaixo)

# 3. Subir todos os serviços (Postgres + LocalStack + API)
docker compose up -d
```

O compose cuida de tudo: sobe o Postgres e o LocalStack (SQS com as filas da Saga, criadas por `localstack/init/criar-recursos.sh`), aguarda os healthchecks, aplica as migrations no serviço one-shot `migrate` e só então inicia a API (mesmo papel do Job `db-migration` no cluster). Sozinho, o OS publica os comandos nas filas, mas ninguém os consome; para ver a Saga completa, use o [teste de integração dos três serviços](#teste-de-integração-dos-três-serviços). O usuário admin padrão (`admin@oficina.com` / `senha123`) é criado por uma migration, sem necessidade de seed manual.

A API estará disponível em `http://localhost:3000` e o Swagger UI em `http://localhost:3000/api`.

## Execução local (desenvolvimento)

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir o banco PostgreSQL e o LocalStack (filas da Saga)
docker compose up postgres localstack -d

# 4. Gerar o Prisma Client e aplicar migrations
npx prisma generate
npx prisma migrate dev

# 5. Iniciar a API em modo de desenvolvimento
npm run start:dev
```

> **Nota:** O docker-compose mapeia a porta do Postgres para `5433` no host. O `.env.example` já reflete isso. Se a porta `5433` estiver ocupada, ajuste no `docker-compose.yml` e no `.env`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | não | Ambiente (`development` ou `production`) |
| `APPLICATION_PORT` | não | Porta exposta no host (default: `3000`) |
| `DATABASE_URL` | sim | String de conexão PostgreSQL (`postgresql://user:pass@host:5433/db?schema=public`) |
| `OFICINA_USER` | sim | Usuário do Postgres (usado pelo docker-compose) |
| `OFICINA_PASSWORD` | sim | Senha do Postgres (usado pelo docker-compose) |
| `OFICINA_DB` | sim | Nome do banco (usado pelo docker-compose) |
| `JWT_SECRET` | sim | Segredo para assinar tokens JWT |
| `JWT_EXPIRES_IN` | não | Expiração do token (default: `1h`) |
| `MAIL_LAMBDA_URL` | sim | URL da Lambda de notificações (rota `/mail` do API Gateway) para onde o app envia os e-mails |
| `MAIL_LAMBDA_TOKEN` | sim | Token de chamada da Lambda de e-mail (header `x-mail-api-token`) |
| `AWS_REGION` | sim | Região das filas da Saga |
| `SAGA_REPLIES_QUEUE_URL` | sim | Fila de respostas que o OS consome (`oficina-os-saga-replies`) |
| `EXECUTION_COMMANDS_QUEUE_URL` | sim | Fila de comandos do Execution (`oficina-execution-commands`) |
| `BILLING_COMMANDS_QUEUE_URL` | sim | Fila de comandos do Billing (`oficina-billing-commands`) |
| `AWS_ENDPOINT_URL` | só local | Aponta o SDK para o LocalStack; no cluster as credenciais vêm da role dos nós do EKS |
| `INTERNAL_API_TOKEN` | sim | Token das rotas `/internal` (header `x-internal-token`), usado pela Lambda de autenticação |
| `LOG_LEVEL` | não | Nível do pino (default: `info`) |
| `NEW_RELIC_ENABLED` | não | Liga o agente de APM, as métricas customizadas e a injeção de `trace.id`/`span.id` no log (default na imagem: `false`) |
| `NEW_RELIC_LICENSE_KEY` | com o agente ligado | Chave de ingestão do New Relic. **Só no `.env` (ignorado pelo git) ou no Secret do cluster** — nunca no `.env.example` |
| `NEW_RELIC_APP_NAME` | não | Nome no APM e valor do atributo `servico` (default: `oficina-api`) |
| `NEW_RELIC_LABELS` | não | Tags padrão (`environment:production;project:tech-challenge-fiap`): marcam a entidade no APM e viram os campos `environment`/`project` de toda linha de log |

> **Segurança:** `.env` e `.env.*` estão no `.gitignore` (a única exceção é o
> `.env.example`, sem valores reais) e no `.dockerignore` — a chave nunca entra
> no repositório nem na imagem. No `docker compose`, o `.env` é lido em runtime;
> no cluster, a chave vem do Secret `app-secret`, sincronizado do SSM pelo CD.

As notificações por e-mail são enviadas por uma **Lambda serverless** — ver [Notificações por e-mail (Lambda)](#notificações-por-e-mail-lambda).

## Notificações por e-mail (Lambda)

O envio de e-mail (finalização e entrega; na Fase 4 o orçamento e o link de pagamento são enviados pelo Billing) **não é feito pelo app**: ele faz um `POST` autenticado para a **Lambda de notificações** — que fica no repositório [`tc3-auth-lambda`](https://github.com/tiagostorch/tc3-auth-lambda), **o mesmo da autenticação por CPF** (as duas Lambdas convivem lá, atrás do mesmo API Gateway) —, na rota `/mail`, e ela cuida do SMTP. O envio é **best-effort** — uma falha é registrada no log e **não bloqueia** a transição de status da OS (com timeout de 15s).

Duas variáveis controlam a integração:

| Variável | De onde vem |
|---|---|
| `MAIL_LAMBDA_URL` | ConfigMap no cluster; `.env` no local. É a rota `/mail` do API Gateway (output `mail_url` do Terraform da Lambda). |
| `MAIL_LAMBDA_TOKEN` | Secret `app-secret` no cluster (o CD lê do SSM `MAIL_API_TOKEN`); `.env` no local. Precisa casar com o token que a Lambda valida (header `x-mail-api-token`). |

A configuração de **SMTP** (host, usuário, senha — Ethereal para testes, ou um provedor real como Amazon SES/SendGrid) vive **na Lambda** (parâmetros no SSM), **não no app**. Ou seja, trocar o provedor de e-mail não toca no código nem no deploy da aplicação.

**Local:** aponte `MAIL_LAMBDA_URL`/`MAIL_LAMBDA_TOKEN` para a Lambda deployada, ou deixe valores quaisquer — o envio falha best-effort, sem quebrar o fluxo. Ao disparar um e-mail (a finalização, quando chega o `ReparoConcluido` da Saga, ou a entrega), o log registra o resultado:

```
LOG [NestMailerEmailSender] Email enviado via Lambda: notificação de finalização (OS: OS-2026-000001) para cliente@teste.com
```

## Autenticação

A API usa **JWT assinado em HS256** e suporta **dois fluxos de autenticação que coexistem**, distinguidos por uma _claim_ de tipo no token e aplicados por um único guard com controle de papel (`@Roles`). Ambos enviam o token no header `Authorization: Bearer <token>`.

### 1. Funcionários (admin) — email + senha

Usuários internos (atendentes, mecânicos, administradores) autenticam pela própria aplicação:

```bash
# Login (retorna accessToken)
POST /auth/login
{
  "email": "admin@oficina.com",
  "senha": "senha123"
}
```

O token administrativo carrega `{ sub, email }` e é resolvido como `tipo: "admin"`. O usuário admin padrão é criado automaticamente pela migration `seed_admin_user` ao aplicar as migrations.

### 2. Clientes — CPF (função serverless)

O cliente da oficina autentica **pelo CPF**, através de uma **função serverless (AWS Lambda)** exposta no API Gateway. Ela vive no repositório [`tc3-auth-lambda`](https://github.com/tiagostorch/tc3-auth-lambda) — **o mesmo repositório que também hospeda a Lambda de notificações por e-mail** (`/mail`); são duas funções no mesmo projeto, atrás do mesmo API Gateway. O fluxo:

1. Cliente envia o CPF → `POST /auth` (API Gateway → Lambda)
2. A Lambda valida os dígitos do CPF, consulta o cliente e verifica se está **ATIVO** (na Fase 4, a consulta passa a ser pela rota interna `POST /internal/clientes/busca`, e a Lambda deixa de ler o banco do OS — ver [Rota interna](#rota-interna-da-lambda-de-autenticação))
3. A Lambda assina um JWT **HS256** com o **mesmo segredo** que a aplicação usa para validar (compartilhado via AWS SSM Parameter Store) e devolve o token
4. O cliente usa esse token nas rotas protegidas por CPF

O token de cliente carrega `{ sub: <clienteId>, tipo: "cliente", cpf, nome }` e é resolvido como `tipo: "cliente"`. A aplicação **não emite** esse token — apenas o valida; a emissão é responsabilidade da Lambda.

### Modelo de papéis e propriedade (roles + ownership)

- O `JwtAuthGuard` valida o token e aplica o papel. **Sem `@Roles(...)` na rota, exige `admin`** — toda rota administrativa continua fechada ao cliente por padrão.
- `@Roles('cliente')` libera as rotas de cliente. Um token admin numa rota de cliente recebe **403**, e um token de cliente numa rota admin também recebe **403**.
- Nas rotas de cliente, além do papel, a aplicação valida **propriedade (ownership)**: o cliente só acessa as **próprias** OS (comparando o `clienteId` do token). OS de terceiros retornam **404** — sem revelar a existência do recurso.

### Fluxo de autenticação (diagrama de sequência)

Duas fases: a **emissão** do token pelo cliente (via função serverless) e o **consumo** de uma rota protegida na aplicação.

```mermaid
sequenceDiagram
    actor C as Cliente
    participant GW as API Gateway
    participant L as Lambda (auth CPF)
    participant DB as Banco (RDS)
    participant APP as Aplicação (NestJS)

    Note over L,APP: Lambda e aplicação compartilham o mesmo<br/>JWT_SECRET (HS256) via SSM Parameter Store

    rect rgb(240, 245, 255)
    Note over C,DB: Fase 1 — Emissão do token (por CPF)
    C->>GW: POST /auth { cpf }
    GW->>L: encaminha
    L->>L: valida dígitos do CPF
    L->>DB: SELECT id, nome, status FROM Cliente WHERE cpfCnpj = ?
    alt CPF inválido
        L-->>C: 400 CPF inválido
    else Cliente não encontrado
        L-->>C: 404 não encontrado
    else status != ATIVO
        L-->>C: 403 inativo
    else Cliente ativo
        L->>L: assina JWT HS256 { sub, tipo:"cliente", cpf, nome }
        L-->>C: 200 { token, expiresIn, cliente }
    end
    end

    rect rgb(240, 255, 245)
    Note over C,DB: Fase 2 — Consumo de rota protegida
    C->>GW: GET /ordens-servico/minhas/:id (Bearer token)
    GW->>APP: encaminha (proxy)
    APP->>APP: JwtStrategy valida assinatura/expiração e resolve tipo=cliente
    APP->>APP: JwtAuthGuard (@Roles 'cliente') + ownership (ordem.clienteId == sub)
    alt token ausente ou inválido
        APP-->>C: 401
    else papel divergente (ex.: admin)
        APP-->>C: 403
    else OS de outro cliente
        APP-->>C: 404
    else autorizado
        APP->>DB: lê a OS com linhas e histórico
        APP-->>C: 200 OS detalhada
    end
    end
```

### Exemplo de uso (cliente por CPF)

```bash
# 1. Obter o token pelo CPF (API Gateway → função serverless)
curl -X POST https://<api-gateway>/auth \
  -H 'Content-Type: application/json' \
  -d '{ "cpf": "529.982.247-25" }'
# → 200 { "token": "<jwt-cliente>", "expiresIn": "1h", "cliente": { "id", "nome" } }
#   (400 CPF inválido | 404 não encontrado | 403 cliente inativo | 500 erro no banco)

# 2. Listar as próprias OS
curl https://<api-gateway>/ordens-servico/minhas \
  -H 'Authorization: Bearer <jwt-cliente>'

# 3. Aprovar o orçamento da própria OS (Billing Service, na Fase 4)
curl https://<api-gateway>/billing/orcamentos?osId=<osId> \
  -H 'Authorization: Bearer <jwt-cliente>'
curl -X POST https://<api-gateway>/billing/orcamentos/<orcamentoId>/aprovar \
  -H 'Authorization: Bearer <jwt-cliente>'
# → 200 com o linkPagamento do Mercado Pago | 403 token admin | 404 orçamento de outro cliente
```

> A distinção admin/cliente é feita na `JwtStrategy` (pela presença de `tipo: "cliente"` vs `email` no payload) e o controle de acesso no `JwtAuthGuard` + decorator `@Roles`. Ver a [RFC-001](docs/rfc/RFC-001-estrategia-autenticacao.md) para a estratégia completa — alternativas consideradas, consequências e riscos.

## Documentação da API

O Swagger UI serve como collection interativa completa das APIs, com todos os DTOs de entrada e resposta, formatos (`uuid`, `email`, `date`), enums, exemplos e códigos HTTP possíveis.

- **Swagger UI (interativo):** `http://localhost:3000/api` — permite executar cada endpoint direto do browser após autenticar via `Authorize` com o `accessToken` do login
- **OpenAPI JSON (para importar em Postman/Insomnia):** `http://localhost:3000/api-json`

## Documentação de arquitetura (RFCs e ADRs)

As decisões técnicas e arquiteturais da Fase 3 estão registradas em Markdown na pasta [`docs/`](docs/). **RFCs** documentam decisões técnicas relevantes (com contexto, alternativas e consequências); **ADRs** registram decisões arquiteturais permanentes.

**RFCs — [`docs/rfc/`](docs/rfc/)**

| RFC | Assunto |
|---|---|
| [RFC-001 — Estratégia de autenticação](docs/rfc/RFC-001-estrategia-autenticacao.md) | Autenticação dupla (funcionário email/senha + cliente por CPF via função serverless), formato dos tokens, papéis/propriedade e integração Lambda↔SSM. Inclui o **diagrama de sequência** do fluxo de auth. |
| [RFC-002 — Escolha da nuvem](docs/rfc/RFC-002-escolha-da-nuvem.md) | Por que **AWS**, mapeamento dos requisitos para os serviços (EKS, RDS, Lambda, API Gateway, ECR, SSM), alternativas (GCP, Azure) e trade-offs. |
| [RFC-003 — Escolha do banco](docs/rfc/RFC-003-escolha-do-banco.md) | Justificativa formal de **PostgreSQL + RDS gerenciado** e os **ajustes no modelo relacional**. |

**ADRs — [`docs/adr/`](docs/adr/)**

| ADR | Decisão |
|---|---|
| [ADR-001 — Ator da trilha de auditoria](docs/adr/ADR-001-ator-trilha-auditoria.md) | Por que o histórico registra o `usuarioCriadorId` (funcionário) em ações de cliente. |
| [ADR-002 — Uso de HPA](docs/adr/ADR-002-uso-de-hpa.md) | Escalabilidade horizontal por HPA (CPU/memória), min/max de réplicas e trade-offs. |
| [ADR-003 — Padrão de comunicação](docs/adr/ADR-003-padrao-de-comunicacao.md) | Comunicação síncrona REST/JSON stateless com JWT; auth desacoplada por segredo compartilhado; webhook e email best-effort. |

## Endpoints da API

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Autenticar usuário e obter token JWT |

### Usuários (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/user` | Listar todos |
| GET | `/user/:id` | Buscar por ID |
| POST | `/user` | Criar — retorna `{ user, senhaGerada }` com a senha em texto puro exibida apenas nesta resposta |
| PUT | `/user/:id` | Atualizar (parcial: email e nome opcionais) |
| DELETE | `/user/:id` | Deletar (204) |

### Clientes (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/cliente` | Listar todos |
| GET | `/cliente/:id` | Buscar por ID |
| POST | `/cliente` | Criar (com validação de CPF/CNPJ e unicidade; 409 se já cadastrado) |
| PUT | `/cliente/:id` | Atualizar (parcial) |
| DELETE | `/cliente/:id` | Deletar (204) |

### Veículos (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/veiculos` | Listar todos |
| GET | `/veiculos/:id` | Buscar por ID |
| POST | `/veiculos` | Criar (com validação de placa Mercosul/tradicional; 409 se placa já cadastrada) |
| PUT | `/veiculos/:id` | Atualizar (parcial) |
| DELETE | `/veiculos/:id` | Deletar (204) |

### Serviços (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/servicos` | Listar todos |
| GET | `/servicos/:id` | Buscar por ID |
| POST | `/servicos` | Criar |
| PUT | `/servicos/:id` | Atualizar (parcial) |
| DELETE | `/servicos/:id` | Deletar (204) |

### Itens de Estoque (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/itens-estoque` | Listar (filtro opcional por tipo: `PECA` ou `INSUMO`) |
| GET | `/itens-estoque/baixo-estoque` | Listar itens abaixo do estoque mínimo |
| GET | `/itens-estoque/:id` | Buscar por ID |
| POST | `/itens-estoque` | Criar (SKU único; 409 se já cadastrado) |
| PUT | `/itens-estoque/:id` | Atualizar (parcial; 409 se novo SKU pertencer a outro item) |
| DELETE | `/itens-estoque/:id` | Deletar (soft delete via `ativo: false`) |

### Ordens de Serviço — Funcionários (JWT admin)
Rotas administrativas (papel `admin` por padrão; token de cliente recebe **403**).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico` | Listar OS ativas: ordenadas por prioridade de status (`EM_EXECUCAO > AGUARDANDO_PAGAMENTO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA`) e mais antigas primeiro dentro do mesmo status. Exclui OS `FINALIZADA`, `ENTREGUE` e `CANCELADA`. |
| GET | `/ordens-servico/:id` | Buscar por ID (com detalhes, linhas e histórico) |
| POST | `/ordens-servico` | Criar por CPF/CNPJ + placa, com serviços e peças opcionais (baixa atômica de estoque). Inicia a Saga: publica `IniciarDiagnostico`. O header `x-correlation-id` vira o fluxo da OS |
| PUT | `/ordens-servico/:id` | Atualizar observações |
| DELETE | `/ordens-servico/:id` | Deletar, só OS `CANCELADA` (409 nas demais: a exclusão deixaria a Saga órfã) |
| POST | `/ordens-servico/:id/servicos` | Adicionar serviço à OS. As rotas de serviços e itens só valem em `RECEBIDA` e `EM_DIAGNOSTICO`, até o diagnóstico concluído (409 depois) |
| PUT | `/ordens-servico/:id/servicos/:linhaId` | Atualizar quantidade de serviço |
| DELETE | `/ordens-servico/:id/servicos/:linhaId` | Remover serviço da OS |
| POST | `/ordens-servico/:id/itens-estoque` | Adicionar item de estoque (com baixa atômica) |
| PUT | `/ordens-servico/:id/itens-estoque/:linhaId` | Atualizar quantidade de item (ajusta estoque por delta) |
| DELETE | `/ordens-servico/:id/itens-estoque/:linhaId` | Remover item (restitui estoque) |
| POST | `/ordens-servico/:id/cancelar` | Cancelar OS que espera o cliente (`AGUARDANDO_APROVACAO` ou `AGUARDANDO_PAGAMENTO`), com `{ motivo }`: devolve o estoque e publica `CancelarOrcamento` |
| POST | `/ordens-servico/:id/transicao-status` | Registrar a entrega (`FINALIZADA` → `ENTREGUE`). As demais transições vêm da Saga (409) |

### Ordens de Serviço — Cliente (autenticação por CPF)
Rotas protegidas por token de cliente (`@Roles('cliente')`) **e** por propriedade: o cliente só opera as próprias OS. Token admin recebe **403**; OS de outro cliente retorna **404**.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico/minhas` | Listar as próprias OS (filtradas pelo `clienteId` do token), das mais recentes às mais antigas |
| GET | `/ordens-servico/minhas/:id` | Detalhar uma OS própria (linhas, totais e histórico de status) |

A aprovação e a recusa do orçamento saíram daqui na Fase 4: são feitas no Billing, em `POST /billing/orcamentos/{id}/aprovar` e `/recusar`.

### Acompanhamento Público (sem JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/ordens-servico/:codigo?placa=` | Consultar OS pelo código e placa (dupla checagem, sem dados sensíveis de terceiros) |

### Interno (Lambda de autenticação)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/internal/clientes/busca` | Busca o cliente pelo CPF (no corpo) e devolve `{ id, nome, status }`. Autenticado pelo header `x-internal-token` |

O webhook externo de aprovação de orçamento passou para o Billing: `POST /billing/webhooks/orcamento`, com o mesmo corpo.

### Relatórios (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico/relatorios/tempo-medio-servicos` | Tempo médio de execução por serviço (com filtros opcionais `dataInicio`, `dataFim`, `servicoId`) |

## Fluxo da Ordem de Serviço

```
RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → AGUARDANDO_PAGAMENTO → EM_EXECUCAO → FINALIZADA → ENTREGUE
                                                                             (ou CANCELADA, por compensação)
```

Na Fase 4 as transições vêm da Saga, a partir das respostas do Billing e do Execution. O ciclo completo, os eventos de cada transição e as compensações estão em [Ciclo da OS](#ciclo-da-os) e [Transições e compensações](#transições-e-compensações). Pela API, o funcionário só registra a entrega e cancela OS que esperam o cliente.

Cada transição registra um `HistoricoStatusOS` com data, usuário e observação. As transições da Saga usam o criador da OS como usuário e dizem na observação quem agiu (ADR-001). Os e-mails são enviados pela Lambda de notificações e são best-effort: uma falha no envio não bloqueia a transição de status.

### Diagrama de sequência — abertura de OS

Fluxo do `POST /ordens-servico`: um funcionário abre a OS por **CPF/CNPJ + placa**, opcionalmente já com serviços e peças. O cliente e o veículo são validados primeiro; a criação em si — validação de serviços/itens, geração do código, criação das linhas com snapshots, baixa de estoque, totais e a publicação do primeiro comando da Saga — roda dentro de uma **única transação atômica** (`createComItens`), que reverte por completo se qualquer item estiver indisponível ou se a publicação falhar.

```mermaid
sequenceDiagram
    actor F as Funcionário (admin)
    participant API as API (NestJS · EKS)
    participant DB as RDS (PostgreSQL)
    participant SQS as SQS (oficina-execution-commands)

    F->>API: POST /ordens-servico (Bearer admin)<br/>{ cpfCnpj, placa, servicos[], itens[] }
    API->>API: JwtAuthGuard (admin) · valida DTO · normaliza CPF/placa
    API->>DB: busca Cliente por cpfCnpj
    alt cliente não encontrado
        API-->>F: 404 cliente não encontrado
    end
    API->>DB: busca Veículo por placa
    alt veículo não encontrado
        API-->>F: 404 veículo não encontrado
    else veículo não pertence ao cliente
        API-->>F: 422
    end
    rect rgb(240, 245, 255)
    Note over API,DB: createComItens — transação atômica única
    API->>DB: valida serviços ativos e itens (estoque suficiente)
    API->>DB: gera código (OSCodigoCounter do ano) · cria OS (RECEBIDA)
    API->>DB: cria linhas (OSServicos/OSItemEstoque) com snapshots · baixa de estoque
    API->>DB: calcula/grava totais · HistoricoStatusOS inicial
    API-)SQS: IniciarDiagnostico (antes do commit)
    end
    alt item/serviço indisponível ou estoque insuficiente
        API-->>F: 422 (transação revertida)
    else publicação falhou
        API-->>F: 500 (transação revertida)
    else sucesso
        API-->>F: 201 { id, codigo, status: RECEBIDA, valorTotal }
    end
```

## Observabilidade

A aplicação escreve **um JSON por linha** no stdout, via `nestjs-pino`. No
cluster, o Fluent Bit do `nri-bundle` recolhe e entrega ao New Relic, que
desestrutura o JSON em atributos consultáveis — nada é escrito em arquivo e não
há CloudWatch no caminho.

```json
{"level":"info","timestamp":1789243924881,"servico":"oficina-api",
 "environment":"production","project":"tech-challenge-fiap",
 "correlationId":"7d2f…","trace.id":"9a1c…","span.id":"4f70…","entity.name":"oficina-api",
 "evento":"ordem_servico.criada","ordem_id":"os-1","codigo":"OS-2026-000042",
 "message":"ordem_servico.criada"}
```

| Campo | De onde vem |
|---|---|
| `level`, `timestamp`, `servico` | Configuração do pino em `src/app.module.ts` — os nomes seguem o que o New Relic indexa nativamente |
| `environment`, `project` | Tags padrão, lidas de `NEW_RELIC_LABELS` (a mesma variável das tags da entidade no APM) |
| `correlationId` | Nas requisições, o id do pino-http (`quietReqLogger`), que reaproveita o `x-correlation-id` recebido ou gera um. No consumo das respostas da Saga, o `correlationId` do envelope da mensagem (`contexto-fluxo.ts`), que é o da OS |
| `osId` | Só no consumo de mensagens: a OS da mensagem |
| `trace.id`, `span.id`, `entity.*` | `mixin` chamando `newrelic.getLinkingMetadata()` — liga o log ao trace distribuído; com um `traceparent` W3C recebido, o `trace.id` é o do cliente |
| `evento` + campos em `snake_case` | Evento de negócio emitido pelo caso de uso |

O agente sobe por `node -r newrelic dist/src/main.js` — o CMD da imagem, em
forma exec —, **antes** de qualquer módulo da aplicação: é essa ordem que
permite a ele instrumentar Express e Prisma no momento em que são importados.
As migrations não rodam mais no CMD: no cluster ficam no Job `db-migration`, e
no `docker compose` no serviço `migrate`. Assim o stdout da API é só JSON e o
Node recebe o SIGTERM direto (desligamento gracioso, com flush do agente).

**Métricas customizadas** (APM, `Custom/OrdemServico/*`): criação de OS, tempo
em cada status (medido no commit de toda transição — da Saga ou manual —, desde a
primeira entrada do status atual no histórico), lead time até a entrega e falhas
por etapa. Detalhes, nomes e consultas NRQL em `tc3-infra-k8s/OBSERVABILIDADE.md`.

**Fluxo distribuído:** o `correlationId` nasce na abertura da OS, fica gravado
nela e vai em toda mensagem da Saga. O Billing e o Execution escrevem o mesmo id
nos seus logs, então filtrar por ele no New Relic mostra a OS nos três serviços
(ver [Rastreamento distribuído](#rastreamento-distribuído)).

Eventos de negócio (`registrarEvento` / `registrarFalha`, em
`src/common/observability/`) saem pelo mesmo logger da requisição, e por isso
herdam o `correlationId` e os campos de trace sem que nenhum caso de uso precise
receber o logger no construtor.

Em desenvolvimento nada disso está ligado: sem `NEW_RELIC_ENABLED=true` o pacote
nem é carregado, e o log sai igual, só que sem os campos de trace. Em teste
unitário os eventos viram no-op, porque `configurarTelemetria` só é chamado no
bootstrap.

Endpoints de saúde, usados pelas probes do Kubernetes, pelo health check do ALB
e pelo monitor de Synthetics:

| Rota | Uso |
|---|---|
| `GET /health` | Liveness raso — não toca no banco |
| `GET /health/ready` | Readiness — `SELECT 1`, responde 503 se o banco cai |

O desenho completo — agentes, dashboard, alertas e o contrato dos campos — está
no repositório de infraestrutura, em `tc3-infra-k8s/OBSERVABILIDADE.md`.

## Testes

Resultado atual:

- **438 testes unitários** (103 suítes), com o Jest exigindo pelo menos 80% de linhas e instruções (`coverageThreshold`): **82,4% de linhas**, 82,3% de instruções, 63,1% de branches e 75,1% de funções. Ficam fora da conta o código gerado do Prisma, os `*.module.ts`, `index.ts` e `main.ts`. O orquestrador da Saga tem um teste por linha da [tabela de transições](#transições-e-compensações).
- **66 testes end-to-end** (10 suítes) com PostgreSQL real (Testcontainers). As respostas do Billing e do Execution são simuladas na fronteira da fila (`responderSaga`), e os comandos publicados ficam num publicador em memória (`ctx.comandos`). Cobrem a Saga de ponta a ponta, as compensações (estoque devolvido, cancelamento, estorno pedido), a trava das linhas e a persistência da Saga (`saga-persistencia.e2e-spec.ts`).
- **Teste de integração com os três serviços** ([`test/integracao/`](test/integracao/)): 45 verificações com OS, Billing e Execution de verdade, LocalStack e o simulador do Mercado Pago (ver [Teste de integração dos três serviços](#teste-de-integração-dos-três-serviços)).
- **BDD do fluxo completo** ([`test/bdd/`](test/bdd/)): um cenário em Gherkin, com 25 passos, da abertura à entrega, com os três serviços juntos, rodando no CI (ver [BDD do fluxo completo](#bdd-do-fluxo-completo)).

```bash
# Todos os testes unitários
npm test

# Com cobertura (gera coverage/lcov-report/index.html)
npm run test:cov

# Testes end-to-end (usa Testcontainers, requer Docker rodando)
npm run test:e2e

# Integração com os três serviços (requer Docker e os repositórios do Billing e do Execution)
cd test/integracao && docker compose -p oficina-integracao up -d --build && bash teste-saga.sh

# BDD do fluxo completo (com o mesmo compose no ar)
BDD_JWT_SECRET=segredo-de-integracao npm run test:bdd

# Teste específico
npx jest src/path/to/file.spec.ts
```

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run start:dev` | Dev server com watch mode |
| `npm run start:debug` | Dev server com debugger |
| `npm run build` | Build de produção |
| `npm run start:prod` | Executar build de produção |
| `npm run lint` | ESLint com auto-fix |
| `npm run format` | Prettier |
| `npm test` | Testes unitários |
| `npm run test:cov` | Testes com cobertura |
| `npm run test:e2e` | Testes end-to-end |
| `npm run test:bdd` | BDD do fluxo completo (três serviços no ar pelo compose de `test/integracao/`) |

---

## Infraestrutura e deploy na AWS (EKS)

O deploy é **automático via CI/CD**: todo push em `develop` ou `main` dispara o `cd.yml`, que builda a imagem, publica no **ECR** e faz o rollout no **EKS** (as duas branches entregam no **mesmo ambiente único**). O provisionamento da infraestrutura (VPC, EKS, node group, RDS, ECR, OIDC, budget) é feito por **Terraform** nos repositórios de infra — ver [Solução em 4 repositórios](#solução-em-4-repositórios).

> **Ambiente único.** Conforme validado com o professor, a Fase 3 usa **um único ambiente** na AWS — a distinção entre homologação e produção foi desconsiderada. As branches `develop` e `main` fazem **deploy automático** para esse mesmo ambiente (o deploy da `main` é rotulado como "production" no GitHub).

### Pipelines (GitHub Actions)

Dois workflows em `.github/workflows/`, cada um com seu `concurrency`. Actions pinadas por SHA; autenticação na AWS por **OIDC** (sem chave estática).

#### `ci.yml` — Integração
| Aspecto | Valor |
|---|---|
| **Trigger** | `push` e `pull_request` em `main`/`develop` |
| **Job** | `Build & Test` — `npm ci` → `prisma generate` → testes unitários → `npm run build` |

#### `cd.yml` — Entrega (deploy automático no EKS)
| Aspecto | Valor |
|---|---|
| **Trigger** | `push` em `main`/`develop` (não roda em PR) |
| **Jobs** | `test` (guard) → `build` (ECR) → `deploy` (EKS), serializados por `concurrency: deploy-homolog` |

**Estágios do `cd.yml`:**

| Estágio | O que faz |
|---|---|
| **Test guard** | Repete os testes antes de empacotar — push quebrado não gera imagem nem deploy. |
| **Build & Push (ECR)** | `configure-aws-credentials` (OIDC) → login no ECR → `docker build --platform linux/amd64` → push no ECR com tag = SHA do commit. |
| **Deploy (EKS)** | `aws eks update-kubeconfig` → monta o `Secret` a partir do **SSM** (com `sslmode=require`) → aplica o ConfigMap → roda o **Job de migration** e **aguarda concluir** → aplica `deployment/service/hpa/ingress/pdb` → `rollout status` → **smoke test** (health/readiness, login, criação de cliente com normalização de CPF, abertura de OS com baixa de estoque, consulta pública, 401, HPA/réplicas). Em falha, um passo `if: failure()` dumpa pods/eventos/logs. |

**Pré-requisitos do pipeline** (configurados uma vez): o secret de repositório **`AWS_ROLE_ARN`** (role OIDC do bootstrap, com acesso ao EKS via *access entry*) e o **trust da role** incluindo este repositório. Sem isso, o `cd.yml` falha em `configure-aws-credentials`.

### Manifestos Kubernetes (`k8s/`)

| Arquivo | Recurso |
|---|---|
| `00-namespace.yaml` | Namespace `oficina` |
| `app/01-configmap.yaml` | ConfigMap (variáveis não sensíveis) |
| `app/03-migration-job.yaml` | Job one-shot `prisma migrate deploy` (roda **de dentro** do cluster, pois o RDS é privado) |
| `app/04-deployment.yaml` | Deployment (2–10 réplicas, probes `/health`, `securityContext`, `topologySpread`) |
| `app/05-service.yaml` | Service ClusterIP :3000 |
| `app/06-hpa.yaml` | HorizontalPodAutoscaler (CPU 70% / memória 80%) |
| `app/07-ingress.yaml` | Ingress ALB internet-facing (healthcheck `/health`) |
| `app/08-pdb.yaml` | PodDisruptionBudget `minAvailable: 1` |

> O `Secret` **não é versionado**: o pipeline o monta no momento do deploy a partir do **SSM Parameter Store** (`DATABASE_URL`, `JWT_SECRET`, `NEW_RELIC_LICENSE_KEY`, `MAIL_API_TOKEN` → `MAIL_LAMBDA_TOKEN` e `INTERNAL_API_TOKEN`, gerado pelo `terraform/` deste repositório). As URLs das filas da Saga ficam no ConfigMap, e o acesso às filas vem da role dos nós do EKS (política em `terraform/iam.tf`). O `JWT_SECRET` e o `MAIL_API_TOKEN` são os **mesmos** que as Lambdas de auth e de e-mail usam — por isso vêm do SSM, e não chumbados. As migrations ficam a cargo do **Job** (a imagem só faz `start`); ver [ADR-002](docs/adr/ADR-002-uso-de-hpa.md) sobre o HPA e a [RFC-001](docs/rfc/RFC-001-estrategia-autenticacao.md) sobre o segredo compartilhado.

> **Pendência para a etapa de integração na AWS:** o smoke test do `cd.yml` abre uma OS de teste, e na Fase 4 isso coloca uma tarefa de diagnóstico na fila real do mecânico. Além disso, a limpeza do smoke não consegue mais excluir a OS, porque só OS `CANCELADA` pode ser excluída. O smoke test precisa ser revisto junto com o deploy dos três serviços.

### Operar o cluster manualmente (kubectl)

Após configurar as credenciais (`aws configure`), conecte o `kubectl` ao EKS:

```bash
aws eks update-kubeconfig --region us-east-1 --name tc3-oficina-homolog
kubectl get pods -n oficina
kubectl get hpa,pdb,ingress -n oficina
kubectl logs -n oficina -l app=oficina-api --tail=50   # logs JSON
```

### Deploy ativo

- **Entrada — API Gateway:** `https://8hkalepe37.execute-api.us-east-1.amazonaws.com` — roteia a autenticação (`/auth`), as notificações (`/mail`) e as rotas protegidas do app (Swagger em `/api`).
- **Acesso direto ao ALB:** `http://k8s-oficina-oficinaa-5b75d4a62f-802718820.us-east-1.elb.amazonaws.com`

> Ambiente acadêmico: para conter custo, o cluster pode estar desligado (`terraform destroy`/`apply` reconstroem em ~20 min).

### Desenvolvimento local em Kubernetes (opcional, Kind)

O diretório `infra/` mantém um Terraform que provisiona um cluster **Kind** local (efêmero) para testar os manifestos sem a AWS. É opcional e independente do deploy na nuvem — o caminho recomendado para desenvolvimento é o [Docker Compose](#execução-local-docker-compose).
