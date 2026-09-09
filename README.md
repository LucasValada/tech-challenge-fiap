# Tech Challenge FIAP - SOAT Oficina

Sistema de gerenciamento de oficina mecânica desenvolvido para o Tech Challenge FIAP SOAT. Este é o **repositório da aplicação principal** (API NestJS que roda em Kubernetes) — um dos **quatro repositórios** da solução (ver [Solução em 4 repositórios](#solução-em-4-repositórios)).

A API cobre a gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com **autenticação dupla** (funcionário por email/senha e cliente por **CPF via função serverless**), envio de orçamento por email, acompanhamento público de OS e observabilidade (health, logs JSON com correlação). Roda na **AWS** — **EKS** (Kubernetes gerenciado), **RDS PostgreSQL** (banco gerenciado), imagem no **ECR**, segredos no **SSM**, exposta por um **ALB** e integrada à **Lambda + API Gateway** de autenticação — tudo provisionado via **Terraform** e entregue por **CI/CD com deploy automático**.

> **Deploy ativo (homologação):** a API é exposta pelo ALB em `http://k8s-oficina-oficinaa-5b75d4a62f-802718820.us-east-1.elb.amazonaws.com` — Swagger em `/api`. (Ambiente acadêmico; pode estar desligado para conter custo.)

## Índice

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
- [Configuração de email (Ethereal)](#configuração-de-email-ethereal)
- [Autenticação](#autenticação)
- [Observabilidade](#observabilidade)
- [Documentação da API](#documentação-da-api)
- [Documentação de arquitetura (RFCs e ADRs)](#documentação-de-arquitetura-rfcs-e-adrs)
- [Endpoints da API](#endpoints-da-api)
- [Fluxo da Ordem de Serviço](#fluxo-da-ordem-de-serviço)
- [Testes](#testes)
- [Scripts disponíveis](#scripts-disponíveis)
- [Infraestrutura e deploy na AWS (EKS)](#infraestrutura-e-deploy-na-aws-eks)

## Objetivos

- Substituir o controle manual por planilhas por um sistema integrado
- Permitir criação e acompanhamento de ordens de serviço com fluxo de status completo (RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE)
- Gerar orçamentos automaticamente com base nos serviços e peças incluídos na OS
- Enviar orçamento ao cliente por email para aprovação
- Permitir que o cliente acompanhe e aprove a OS via API pública (sem autenticação)
- Controlar estoque de peças e insumos com alerta de estoque mínimo
- Monitorar tempo médio de execução dos serviços
- Prover infraestrutura reprodutível via Terraform e Kubernetes, com deploy automatizado por pipeline CI/CD

## Solução em 4 repositórios

A Fase 3 exige a segregação da solução em **quatro repositórios git independentes**, cada um com seu próprio CI/CD e deploy automático para a nuvem. **Este repositório é o nº 4 (aplicação principal).**

| # | Repositório | Papel | Stack |
|---|---|---|---|
| 1 | `fase3-lambda-auth-cpf` | Function Serverless de autenticação por CPF **+ API Gateway** (porta de entrada da solução) | AWS Lambda (Node), API Gateway HTTP v2, `pg` |
| 2 | `fase3-infra-k8s` | Terraform do **cluster EKS** (VPC, EKS, node group, ECR, ALB Controller, OIDC, budget) | Terraform, módulos AWS |
| 3 | `fase3-infra-database` | Terraform do **RDS PostgreSQL** gerenciado (+ publicação dos segredos no SSM) | Terraform, RDS |
| 4 | **`fase3-app` (este repo)** | **Aplicação principal** NestJS rodando no EKS | NestJS 11, Prisma 7, PostgreSQL |

Os repositórios se integram por **rede privada (VPC)**, **SSM Parameter Store** (segredos compartilhados, incl. o `JWT_SECRET` que a Lambda e a app usam) e **`terraform_remote_state`**. Por que AWS e como cada peça se encaixa: ver **[RFC-002 — Escolha da nuvem](docs/rfc/RFC-002-escolha-da-nuvem.md)**.

## Vídeo demonstrativo

Vídeo (YouTube, até 15 minutos) cobrindo autenticação por CPF, execução do CI/CD, deploy automatizado, consumo das APIs protegidas, dashboard de monitoramento e logs/traces em execução.

**Link:** [https://youtu.be/LJf5b5OW0gM](https://youtu.be/LJf5b5OW0gM)

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

### Diagrama de Componentes — visão de nuvem

Visão de alto nível de toda a solução na AWS: o cliente entra pelo **API Gateway**, que roteia a autenticação para a **Lambda** e as rotas protegidas para o **ALB → pods no EKS**; a aplicação e a Lambda usam o **RDS** (banco gerenciado) e compartilham segredos pelo **SSM**; a imagem vem do **ECR**; e a observabilidade coleta métricas, logs e traces.

```mermaid
graph TB
    Cliente["Cliente / Funcionário<br/>browser · curl · Postman"]
    Webhook["Sistema externo<br/>aprovação de orçamento"]
    SMTP["SMTP<br/>Ethereal / SES"]
    Obs["Observabilidade<br/>New Relic — métricas, APM, dashboards,<br/>alertas (em implementação) + logs JSON"]

    subgraph AWS["AWS · us-east-1"]
        GW["<b>API Gateway</b> (HTTP v2)<br/>POST /auth → Lambda<br/>ANY /&#123;proxy+&#125; → ALB (VPC Link)"]
        ECR["<b>ECR</b><br/>imagem da API"]
        SSM["<b>SSM Parameter Store</b><br/>JWT_SECRET, DATABASE_URL<br/>(SecureString)"]

        subgraph VPC["VPC — subnets privadas"]
            Lambda["<b>Lambda</b> — auth por CPF<br/>valida CPF · checa status · emite JWT"]
            ALB["<b>ALB</b> internet-facing<br/>Ingress via ALB Controller"]

            subgraph EKS["<b>EKS</b> — cluster Kubernetes"]
                Pods["Deployment oficina-api<br/>2–10 pods (HPA) em 2 AZs<br/>NestJS · /health · logs JSON"]
            end

            RDS[("<b>RDS PostgreSQL</b><br/>gerenciado · TLS · subnet privada")]
        end
    end

    Cliente -->|"HTTPS/REST + JWT"| GW
    GW -->|"POST /auth"| Lambda
    GW -->|"rotas protegidas (VPC Link)"| ALB
    ALB --> Pods
    Lambda -->|"SELECT cliente (TLS)"| RDS
    Pods -->|"SQL/TLS 5432"| RDS
    Pods -->|"pull imagem"| ECR
    Pods -->|"lê segredos"| SSM
    Lambda -->|"mesmo JWT_SECRET"| SSM
    Pods -->|"email best-effort"| SMTP
    Webhook -->|"POST /webhooks/orcamento"| ALB
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
        Webhook["<b>Sistema Externo de Aprovação</b><br/><i>[External System]</i><br/>Envia decisão de orçamento via<br/>POST /webhooks/orcamento com<br/>X-Webhook-Token"]
        SMTP["<b>SMTP Ethereal</b><br/><i>[External System]</i><br/>Servidor SMTP falso para emails<br/>de orçamento, finalização e entrega"]
    end

    Clientes -->|"HTTPS / REST<br/>JSON + JWT (privado) ou<br/>código+placa (público)"| API
    Webhook -->|"POST /webhooks/orcamento<br/>JSON + X-Webhook-Token"| API
    API -->|"reads/writes<br/>TCP 5432 via Prisma"| DB
    API -->|"envia emails<br/>SMTP 587"| SMTP

    class Clientes person
    class Webhook,SMTP external
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
            Controllers["<b>Controllers + Guards</b><br/><i>[Component: NestJS Controller]</i><br/>JwtAuthGuard, WebhookTokenGuard"]
            DTOs["<b>DTOs de entrada e resposta</b><br/><i>[Component: class-validator]</i><br/>Validação declarativa de payload"]
        end

        subgraph ApplicationLayer["Camada Application — src/modules/&lt;m&gt;/application"]
            direction LR
            UseCases["<b>Use Cases</b><br/><i>[Component: @Injectable NestJS]</i><br/>1 classe = 1 responsabilidade,<br/>método execute"]
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
            Mailer["<b>NestMailerEmailSender</b><br/><i>[Component: @nestjs-modules/mailer]</i><br/>mail/infra, provider EMAIL_SENDER"]
        end

        subgraph SharedInfra["Infra compartilhada — src/infra e src/modules/prisma"]
            direction LR
            PrismaSvc["<b>PrismaService</b><br/><i>[Component: pg.Pool + PrismaPg adapter]</i><br/>Bootstrap do Prisma Client"]
            PrismaRepos["<b>Prisma Repositories</b><br/><i>[Component: Prisma Client 7]</i><br/>src/infra/database/prisma/repositories"]
        end
    end

    subgraph Externos["Sistemas externos"]
        direction TB
        DB[("<b>PostgreSQL 17</b><br/><i>[ContainerDb: Banco relacional]</i>")]
        SMTP["<b>SMTP Ethereal</b><br/><i>[External System]</i><br/>Emails de dev"]
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
    Bcrypt -.->|"implementa (PasswordHasher)"| Repos
    Jwt -.->|"implementa (TokenIssuer)"| Repos
    Mailer -.->|"implementa (EmailSender)"| Repos

    PrismaRepos -->|"usa Prisma Client"| PrismaSvc
    PrismaSvc -->|"TCP 5432 / pg driver"| DB
    Mailer -->|"envia email / SMTP 587"| SMTP

    class Cliente person
    class DB database
    class SMTP external
    class Controllers,DTOs,UseCases,Mappers,Shared,Entities,DomainSvc,Repos,Bcrypt,Jwt,Mailer,PrismaSvc,PrismaRepos component
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
        SSM["SSM /tc3-oficina/homolog/*<br/>DATABASE_URL · JWT_SECRET (SecureString)"]
    end

    Ingress --> Svc --> Deploy
    HPA -.->|escala| Deploy
    PDB -.->|protege| Deploy
    Deploy -.->|envFrom| CM
    Deploy -.->|secretKeyRef| Sec
    Deploy -->|"SQL/TLS 5432"| RDS
    Deploy -->|pull imagem| ECR
    Sec -.->|sincronizado de| SSM
    Job -->|aplica migrations| RDS
    MS -.->|coleta métricas| Deploy
```

### Fluxo de deploy (CI/CD)

Dois workflows em `.github/workflows/`. `ci.yml` valida cada mudança; `cd.yml` empacota e faz o **deploy automático no EKS** a cada push em `develop`/`main` (ambas apontam para o ambiente homolog). Autenticação na AWS por **OIDC** (sem chave estática); actions pinadas por SHA.

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
    Deploy --> EKSc["Cluster EKS (homolog)<br/>aplicação atualizada e validada"]
```

> Diagnóstico em falha: se um step do deploy quebra, um passo `if: failure()` dumpa `kubectl get all`, `describe pods`, eventos e logs do namespace. O **smoke test** exercita, contra o app deployado, health/readiness, login, criação de cliente (com normalização de CPF), abertura de OS com baixa de estoque, consulta pública, 401 e HPA/réplicas.

## Justificativa do banco de dados

**PostgreSQL** foi escolhido por:

- **Integridade referencial:** o domínio possui múltiplas entidades com relacionamentos complexos (OS → Cliente, Veículo, Serviços, Itens, Histórico). O PostgreSQL garante consistência com foreign keys e transações ACID, essencial para operações atômicas como baixa de estoque ao adicionar itens na OS.
- **Tipos nativos:** suporte a `UUID`, `DECIMAL` (valores monetários), `ENUM` (status da OS, tipo de item) e `TIMESTAMP WITH TIME ZONE` sem necessidade de workarounds.
- **Desempenho em consultas analíticas:** o relatório de tempo médio de execução usa agregações que o PostgreSQL lida com eficiência.
- **Ecossistema maduro:** integração consolidada com Prisma 7 (via driver adapter `@prisma/adapter-pg`) e documentação abrangente.

Na Fase 3 o banco passou de Postgres-em-cluster para **RDS PostgreSQL gerenciado** (subnet privada, TLS obrigatório, backups e métricas geridos pela AWS), provisionado no repositório `fase3-infra-database`. A modelagem também foi **melhorada** (campo `status` em `Cliente`, snapshots imutáveis nas linhas da OS, numeração sequencial anual e políticas de exclusão explícitas).

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
        enum status "6 estados"
        decimal valorTotal
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
| **Observabilidade** | `nestjs-pino` (logs JSON + correlation id) · endpoints `/health` e `/health/ready` |
| **Container** | Docker (multi-stage, non-root) · Docker Compose (local) |
| **Nuvem (AWS)** | **EKS** (Kubernetes 1.3x) · **RDS PostgreSQL** · **Lambda + API Gateway** · **ECR** · **SSM** · **ALB** |
| **IaC / CI-CD** | Terraform · GitHub Actions (OIDC, deploy no EKS) |
| **Testes** | Jest (unit) · Testcontainers (e2e com Postgres real) |

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

# 3. Subir todos os serviços (Postgres + API)
docker compose up -d
```

O compose cuida de tudo: sobe o Postgres, aguarda o healthcheck, aplica as migrations automaticamente e inicia a API. O usuário admin padrão (`admin@oficina.com` / `senha123`) é criado por uma migration, sem necessidade de seed manual.

A API estará disponível em `http://localhost:3000` e o Swagger UI em `http://localhost:3000/api`.

## Execução local (desenvolvimento)

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env

# 3. Subir apenas o banco PostgreSQL
docker compose up postgres -d

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
| `MAIL_HOST` | não | Host SMTP (default: `smtp.ethereal.email`) |
| `MAIL_PORT` | não | Porta SMTP (default: `587`) |
| `MAIL_USER` | não | Usuário SMTP |
| `MAIL_PASS` | não | Senha SMTP |
| `MAIL_FROM` | não | Remetente padrão dos emails |
| `WEBHOOK_ORCAMENTO_TOKEN` | sim | Token compartilhado para autenticar `POST /webhooks/orcamento` |

Para o envio de email em desenvolvimento, siga o passo a passo da seção [Configuração de email (Ethereal)](#configuração-de-email-ethereal).

## Configuração de email (Ethereal)

O envio de email de orçamento, finalização e entrega da OS é feito via SMTP. Para não depender de um provedor real em ambiente de desenvolvimento, a aplicação foi pensada para funcionar com [Ethereal](https://ethereal.email), um SMTP falso e gratuito que captura toda mensagem enviada e disponibiliza uma URL de preview (nenhum email chega ao destinatário real).

### 1. Criar uma conta Ethereal

1. Acesse [https://ethereal.email/create](https://ethereal.email/create)
2. Clique em **Create Ethereal Account** — a conta é gerada instantaneamente, sem cadastro nem confirmação de email
3. A página exibe as credenciais SMTP:

```
Name:     Ethereal <ethereal.user@ethereal.email>
Username: xxxxxxxxxxxxxxxxxx@ethereal.email
Password: yyyyyyyyyyyyyyyyyy
Host:     smtp.ethereal.email
Port:     587
Security: STARTTLS
```

> **Anote as credenciais** — a página não fica salva. Se perder, basta gerar uma conta nova.

### 2. Preencher o `.env`

Cole os valores gerados nas variáveis `MAIL_*` do `.env`:

```env
MAIL_HOST="smtp.ethereal.email"
MAIL_PORT=587
MAIL_USER="<Username gerado pelo Ethereal>"
MAIL_PASS="<Password gerada pelo Ethereal>"
MAIL_FROM='"Oficina SOAT" <noreply@oficina.com>'
```

O `MAIL_FROM` pode ser qualquer valor — o Ethereal aceita qualquer remetente.

### 3. Ver os emails enviados

Após disparar qualquer email pela API (`POST /ordens-servico/:id/enviar-orcamento` ou uma transição para `FINALIZADA`/`ENTREGUE`), o log da aplicação imprime uma **Preview URL**:

```
LOG [NestMailerEmailSender] Email de orçamento enviado para cliente@teste.com (OS: OS-2026-000001)
LOG [NestMailerEmailSender] Preview URL (Ethereal): https://ethereal.email/message/akw7gic6bekDZcIrak6...
```

Abra a URL no navegador para ver o email exatamente como o cliente receberia (assunto, corpo em texto puro, HTML se houver). Também é possível abrir [https://ethereal.email/messages](https://ethereal.email/messages) logado com a conta criada para ver todos os emails na caixa de entrada.

> **Em produção**, substitua `MAIL_HOST`/`MAIL_PORT`/`MAIL_USER`/`MAIL_PASS` por um provedor SMTP real (SendGrid, Amazon SES, Gmail, etc). Se qualquer envio falhar, a aplicação registra o erro no log e segue o fluxo — o email é best-effort e uma falha não bloqueia a transição de status da OS.

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

O cliente da oficina autentica **pelo CPF**, através de uma **função serverless (AWS Lambda)** exposta no API Gateway — repositório separado (`fase3-lambda-auth-cpf`). O fluxo:

1. Cliente envia o CPF → `POST /auth` (API Gateway → Lambda)
2. A Lambda valida os dígitos do CPF, consulta o cliente no banco e verifica se está **ATIVO**
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
    C->>GW: POST /ordens-servico/minhas/:id/aprovar (Bearer token)
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
        APP->>DB: transiciona AGUARDANDO_APROVACAO → EM_EXECUCAO
        APP-->>C: 200 OS atualizada
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

# 3. Aprovar o orçamento da própria OS (AGUARDANDO_APROVACAO → EM_EXECUCAO)
curl -X POST https://<api-gateway>/ordens-servico/minhas/<osId>/aprovar \
  -H 'Authorization: Bearer <jwt-cliente>'
# → 200 (OS em EM_EXECUCAO) | 403 token admin | 404 OS de outro cliente
```

> A distinção admin/cliente é feita na `JwtStrategy` (pela presença de `tipo: "cliente"` vs `email` no payload) e o controle de acesso no `JwtAuthGuard` + decorator `@Roles`. Ver a [RFC-001](docs/rfc/RFC-001-estrategia-autenticacao.md) para a estratégia completa — alternativas consideradas, consequências e riscos.

## Observabilidade

A aplicação foi instrumentada para dar **visibilidade total** sobre o funcionamento, como o desafio pede.

**Healthchecks e uptime** — endpoints dedicados (públicos), usados pelas probes do Kubernetes e pelo health check do ALB:

| Endpoint | Tipo | Verifica |
|---|---|---|
| `GET /health` | liveness | processo no ar (raso, não depende do banco) |
| `GET /health/ready` | readiness | conexão com o banco (`SELECT 1`); responde `503` se o banco não responde |

**Logs estruturados (JSON) com correlação** — via `nestjs-pino`. Cada requisição recebe um **`correlationId`**: a aplicação reaproveita um id vindo do API Gateway/ALB (`x-correlation-id`, `x-amzn-trace-id`, etc.) quando presente, ou gera um, e o devolve no header `x-correlation-id` — fechando a correlação **ponta a ponta** com a Lambda (que já loga em JSON com `requestId`). Headers sensíveis (`authorization`, `cookie`, `x-webhook-token`) são redigidos no log.

```json
{ "level": 30, "correlationId": "1-6a97...", "req": { "method": "POST", "url": "/ordens-servico" },
  "res": { "statusCode": 201 }, "responseTime": 42, "msg": "request completed" }
```

**Métricas, dashboards e alertas** — a integração com o **APM (New Relic)** está em implementação (frente do time) e cobre: **latência das APIs**, **consumo de CPU/memória do Kubernetes** (o `metrics-server` já alimenta o HPA), **alertas para falhas no processamento de OS**, e os dashboards de **volume diário de OS**, **tempo médio de execução por status** e **erros nas integrações**. A aplicação já produz o dado de base para esses painéis: cada transição grava um `HistoricoStatusOS` (com timestamps) e existe o endpoint de relatório de tempo médio por serviço.

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
| GET | `/ordens-servico` | Listar OS ativas: ordenadas por prioridade de status (`EM_EXECUCAO > AGUARDANDO_APROVACAO > EM_DIAGNOSTICO > RECEBIDA`) e mais antigas primeiro dentro do mesmo status. Excluí OS `FINALIZADA` e `ENTREGUE`. |
| GET | `/ordens-servico/:id` | Buscar por ID (com detalhes, linhas e histórico) |
| POST | `/ordens-servico` | Criar por CPF/CNPJ + placa, com serviços e peças opcionais (baixa atômica de estoque) |
| PUT | `/ordens-servico/:id` | Atualizar observações |
| DELETE | `/ordens-servico/:id` | Deletar (cascade nas linhas filhas) |
| POST | `/ordens-servico/:id/servicos` | Adicionar serviço à OS |
| PUT | `/ordens-servico/:id/servicos/:linhaId` | Atualizar quantidade de serviço |
| DELETE | `/ordens-servico/:id/servicos/:linhaId` | Remover serviço da OS |
| POST | `/ordens-servico/:id/itens-estoque` | Adicionar item de estoque (com baixa atômica) |
| PUT | `/ordens-servico/:id/itens-estoque/:linhaId` | Atualizar quantidade de item (ajusta estoque por delta) |
| DELETE | `/ordens-servico/:id/itens-estoque/:linhaId` | Remover item (restitui estoque) |
| POST | `/ordens-servico/:id/enviar-orcamento` | Enviar orçamento ao cliente por email (transiciona `EM_DIAGNOSTICO` → `AGUARDANDO_APROVACAO`) |
| POST | `/ordens-servico/:id/transicao-status` | Transicionar status (avanço linear ou rollback de 1 passo, com validação de máquina de estados) |

### Ordens de Serviço — Cliente (autenticação por CPF)
Rotas protegidas por token de cliente (`@Roles('cliente')`) **e** por propriedade: o cliente só opera as próprias OS. Token admin recebe **403**; OS de outro cliente retorna **404**.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico/minhas` | Listar as próprias OS (filtradas pelo `clienteId` do token), das mais recentes às mais antigas |
| GET | `/ordens-servico/minhas/:id` | Detalhar uma OS própria (linhas, totais e histórico de status) |
| POST | `/ordens-servico/minhas/:id/aprovar` | Aprovar o orçamento da própria OS (transiciona `AGUARDANDO_APROVACAO` → `EM_EXECUCAO`) |
| POST | `/ordens-servico/minhas/:id/rejeitar` | Rejeitar o orçamento da própria OS (rollback `AGUARDANDO_APROVACAO` → `EM_DIAGNOSTICO`) |

### Acompanhamento Público (sem JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/ordens-servico/:codigo?placa=` | Consultar OS pelo código e placa (dupla checagem, sem dados sensíveis de terceiros) |

### Webhook Externo
| Método | Rota | Descrição |
|---|---|---|
| POST | `/webhooks/orcamento` | Receber decisão externa de aprovação (`aprovado: true` → `EM_EXECUCAO`) ou recusa (`aprovado: false` → rollback para `EM_DIAGNOSTICO`). Autenticado por header `X-Webhook-Token`. |

### Relatórios (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico/relatorios/tempo-medio-servicos` | Tempo médio de execução por serviço (com filtros opcionais `dataInicio`, `dataFim`, `servicoId`) |

## Fluxo da Ordem de Serviço

```
RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE
```

1. **RECEBIDA:** OS criada com cliente (CPF/CNPJ) e veículo (placa)
2. **EM_DIAGNOSTICO:** mecânico avalia e adiciona serviços/peças necessários
3. **AGUARDANDO_APROVACAO:** orçamento enviado ao cliente por email (endpoint `enviar-orcamento`), aguardando a decisão do cliente. O cliente pode **rejeitar** (autenticado por CPF, `POST /ordens-servico/minhas/:id/rejeitar`), fazendo rollback para `EM_DIAGNOSTICO` para ajuste e reenvio
4. **EM_EXECUCAO:** cliente **aprova** o orçamento autenticado por CPF (`POST /ordens-servico/minhas/:id/aprovar`). Alternativas: webhook externo (`aprovado: true`, integração máquina-a-máquina) ou avanço manual pelo admin
5. **FINALIZADA:** serviço concluído (email automático ao cliente com `finalizadaAt`)
6. **ENTREGUE:** veículo devolvido ao cliente (email automático de confirmação com `entregueAt`)

Cada transição registra um `HistoricoStatusOS` com data, usuário e observação. Envios de email são best-effort: uma falha do SMTP não bloqueia a transição de status.

### Diagrama de sequência — abertura de OS

Fluxo do `POST /ordens-servico`: um funcionário abre a OS por **CPF/CNPJ + placa**, opcionalmente já com serviços e peças. O cliente e o veículo são validados primeiro; a criação em si — validação de serviços/itens, geração do código, criação das linhas com snapshots, baixa de estoque e totais — roda dentro de uma **única transação atômica** (`createComItens`), que reverte por completo se qualquer item estiver indisponível.

```mermaid
sequenceDiagram
    actor F as Funcionário (admin)
    participant API as API (NestJS · EKS)
    participant DB as RDS (PostgreSQL)

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
    end
    alt item/serviço indisponível ou estoque insuficiente
        API-->>F: 422 (transação revertida)
    else sucesso
        API-->>F: 201 { id, codigo, status: RECEBIDA, valorTotal }
    end
```

## Testes

Cobertura atual: **313 testes unitários** (84 suites) + **62 testes end-to-end** (9 suites, com Postgres real via Testcontainers).

- Statements: **68.53%**
- Branches: **58.55%**
- Functions: **66.38%**

```bash
# Todos os testes unitários
npm test

# Com cobertura (gera coverage/lcov-report/index.html)
npm run test:cov

# Testes end-to-end (usa Testcontainers, requer Docker rodando)
npm run test:e2e

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

---

## Infraestrutura e deploy na AWS (EKS)

O deploy é **automático via CI/CD**: todo push em `develop` ou `main` dispara o `cd.yml`, que builda a imagem, publica no **ECR** e faz o rollout no **EKS** (as duas branches entregam no mesmo ambiente de homologação). O provisionamento da infraestrutura (VPC, EKS, node group, RDS, ECR, OIDC, budget) é feito por **Terraform** nos repositórios de infra — ver [Solução em 4 repositórios](#solução-em-4-repositórios).

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

> O `Secret` **não é versionado**: o pipeline o monta a partir do **SSM Parameter Store** no momento do deploy (`DATABASE_URL`, `JWT_SECRET`) + valores de mail/webhook. O `JWT_SECRET` é o **mesmo** que a Lambda usa para assinar o token — por isso é lido do SSM, e não chumbado. As migrations ficam a cargo do **Job** (a imagem só faz `start`); ver [ADR-002](docs/adr/ADR-002-uso-de-hpa.md) sobre o HPA e a [RFC-001](docs/rfc/RFC-001-estrategia-autenticacao.md) sobre o segredo compartilhado.

### Operar o cluster manualmente (kubectl)

Após configurar as credenciais (`aws configure`), conecte o `kubectl` ao EKS:

```bash
aws eks update-kubeconfig --region us-east-1 --name tc3-oficina-homolog
kubectl get pods -n oficina
kubectl get hpa,pdb,ingress -n oficina
kubectl logs -n oficina -l app=oficina-api --tail=50   # logs JSON
```

### Deploy ativo (homologação)

- **API (via ALB):** `http://k8s-oficina-oficinaa-5b75d4a62f-802718820.us-east-1.elb.amazonaws.com` — Swagger em `/api`
- **Autenticação por CPF (Lambda via API Gateway):** `POST https://8hkalepe37.execute-api.us-east-1.amazonaws.com/auth`

> Ambiente acadêmico: para conter custo, o cluster pode estar desligado (`terraform destroy`/`apply` reconstroem em ~20 min).

### Desenvolvimento local em Kubernetes (opcional, Kind)

O diretório `infra/` mantém um Terraform que provisiona um cluster **Kind** local (efêmero) para testar os manifestos sem a AWS. É opcional e independente do deploy na nuvem — o caminho recomendado para desenvolvimento é o [Docker Compose](#execução-local-docker-compose).
