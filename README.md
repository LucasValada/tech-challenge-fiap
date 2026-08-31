# Tech Challenge FIAP - SOAT Oficina

Sistema de gerenciamento de oficina mecânica desenvolvido para o Tech Challenge FIAP SOAT. API back-end para gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com **autenticação dupla** (JWT de funcionário por email/senha e de cliente por **CPF via função serverless**), envio de orçamento por email, acompanhamento público de OS e infraestrutura provisionada via Terraform + Kubernetes.

## Índice

- [Objetivos](#objetivos)
- [Vídeo demonstrativo](#vídeo-demonstrativo)
- [Clean Architecture](#clean-architecture)
- [Arquitetura](#arquitetura)
  - [Componentes da aplicação](#componentes-da-aplicação)
  - [Infraestrutura provisionada](#infraestrutura-provisionada)
  - [Fluxo de deploy](#fluxo-de-deploy)
- [Justificativa do banco de dados](#justificativa-do-banco-de-dados)
- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Execução com Docker](#execução-com-docker-recomendado)
- [Execução local (desenvolvimento)](#execução-local-desenvolvimento)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Configuração de email (Ethereal)](#configuração-de-email-ethereal)
- [Autenticação](#autenticação)
- [Documentação da API](#documentação-da-api)
- [Documentação de arquitetura (RFC e ADR)](#documentação-de-arquitetura-rfc-e-adr)
- [Endpoints da API](#endpoints-da-api)
- [Fluxo da Ordem de Serviço](#fluxo-da-ordem-de-serviço)
- [Testes](#testes)
- [Scripts disponíveis](#scripts-disponíveis)
- [Infraestrutura (Fase 2)](#infraestrutura-fase-2)

## Objetivos

- Substituir o controle manual por planilhas por um sistema integrado
- Permitir criação e acompanhamento de ordens de serviço com fluxo de status completo (RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE)
- Gerar orçamentos automaticamente com base nos serviços e peças incluídos na OS
- Enviar orçamento ao cliente por email para aprovação
- Permitir que o cliente acompanhe e aprove a OS via API pública (sem autenticação)
- Controlar estoque de peças e insumos com alerta de estoque mínimo
- Monitorar tempo médio de execução dos serviços
- Prover infraestrutura reprodutível via Terraform e Kubernetes, com deploy automatizado por pipeline CI/CD

## Vídeo demonstrativo

Vídeo (YouTube, até 15 minutos) cobrindo deploy da aplicação, execução do CI/CD, consumo das APIs e escalabilidade automática do HPA sob carga.

**Link:** [https://youtu.be/LJf5b5OW0gM](https://youtu.be/LJf5b5OW0gM)

## Clean Architecture

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

### Componentes da aplicação

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

### Infraestrutura provisionada

```mermaid
graph TB
    HostApp[Host localhost:3000]
    HostDb[Host localhost:5432]

    subgraph KindCluster[Kind Cluster provisionado por Terraform]
        subgraph ControlPlane[Control Plane]
            CP[oficina-cluster-control-plane<br/>extra_port_mappings:<br/>host 3000 ↔ NodePort 30080<br/>host 5432 ↔ NodePort 30432]
        end

        subgraph Workers[Workers]
            W1[oficina-cluster-worker]
            W2[oficina-cluster-worker2]
        end

        subgraph NamespaceOficina[Namespace oficina]
            HPA[HorizontalPodAutoscaler<br/>min 2, max 10<br/>CPU 70%, Memória 80%]
            Deploy[Deployment oficina-api<br/>2 réplicas com readiness/liveness]
            SvcApi[Service oficina-api<br/>NodePort 30080 → containerPort 3000]
            SS[StatefulSet postgres<br/>1 réplica]
            PVC[PVC 5Gi<br/>volumeClaimTemplates]
            PgSec[Secret postgres-secret<br/>POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB]
            SvcPgCluster[Service postgres<br/>ClusterIP :5432<br/>consumido pelos pods da API]
            SvcPgNode[Service postgres-nodeport<br/>NodePort 30432 → 5432<br/>acesso opcional externo]
            CM[ConfigMap app-config<br/>APPLICATION_PORT, MAIL_HOST etc]
            Sec[Secret app-secret<br/>DATABASE_URL, JWT_SECRET, MAIL_PASS etc]
            Job[Job db-migration<br/>prisma migrate deploy]
        end

        subgraph KubeSystem[Namespace kube-system]
            MS[Metrics Server<br/>--kubelet-insecure-tls]
        end

        HPA -.->|escala CPU 70%, mem 80%| Deploy
        SvcApi --> Deploy
        SS --> PVC
        SS -.->|secretKeyRef| PgSec
        SvcPgCluster --> SS
        SvcPgNode --> SS
        Deploy -.->|envFrom| CM
        Deploy -.->|envFrom| Sec
        Deploy -.->|DATABASE_URL| SvcPgCluster
        Job --> SvcPgCluster
        MS -.->|coleta métricas| Deploy
    end

    HostApp -.->|host_port 3000| CP
    HostDb -.->|host_port 5432| CP
    CP --- W1
    CP --- W2
```

### Fluxo de deploy

```mermaid
graph LR
    Dev[Developer<br/>push ou PR em main ou develop]
    GH[GitHub Actions<br/>concurrency cancela runs obsoletos<br/>actions com SHA pinning e node24]

    Dev --> GH

    subgraph CI["ci.yml — Continuous Integration (push + PR)"]
        CIJob[Build and Test<br/>npm ci<br/>prisma generate<br/>npm test - 300 unitários<br/>npm run build]
    end

    subgraph CD["cd.yml — Continuous Delivery (apenas push)"]
        S1[Estágio 1 - Build and Test guard<br/>mesma validação do CI<br/>garante que push quebrado não deploya]
        S2[Estágio 2 - Docker<br/>setup-buildx-action<br/>build multi-stage<br/>fix Prisma .ts imports<br/>cache GHA<br/>push para GHCR - tag sha-xxx + latest na main]
        S3[Estágio 3 - Deploy to Kind<br/>terraform apply provisiona cluster<br/>kind load docker-image<br/>Metrics Server + patch TLS<br/>kubectl apply k8s/postgres + rollout status<br/>Job de migration<br/>kubectl apply k8s/app<br/>Diagnose on failure - dumpa pods/events/logs<br/>Smoke test 16 verificações end-to-end]

        S1 --> S2 --> S3
    end

    GH --> CIJob
    GH --> S1
    S3 --> Cluster[Kind Cluster efêmero<br/>com aplicação validada]
```

## Justificativa do banco de dados

**PostgreSQL** foi escolhido por:

- **Integridade referencial:** o domínio possui múltiplas entidades com relacionamentos complexos (OS → Cliente, Veículo, Serviços, Itens, Histórico). O PostgreSQL garante consistência com foreign keys e transações ACID, essencial para operações atômicas como baixa de estoque ao adicionar itens na OS.
- **Tipos nativos:** suporte a `UUID`, `DECIMAL` (valores monetários), `ENUM` (status da OS, tipo de item) e `TIMESTAMP WITH TIME ZONE` sem necessidade de workarounds.
- **Desempenho em consultas analíticas:** o relatório de tempo médio de execução usa agregações que o PostgreSQL lida com eficiência.
- **Ecossistema maduro:** integração consolidada com Prisma 7 (via driver adapter `@prisma/adapter-pg`) e documentação abrangente.
- **Custo zero:** open source, sem licenciamento, ideal para o escopo acadêmico do Tech Challenge.

## Stack

| Tecnologia | Versão |
|---|---|
| Node.js | 24.x |
| NestJS | 11.x |
| Prisma | 7.x |
| PostgreSQL | 17 |
| Docker / Docker Compose | 29.x / 5.x |
| Kubernetes | 1.35 (via Kind 0.27+) |
| Terraform | 1.6+ |

## Pré-requisitos

- Node.js 24+
- npm 11+
- Docker e Docker Compose

Para o provisionamento em Kubernetes:

- Kind 0.27+
- Terraform 1.6+
- kubectl

## Execução com Docker (recomendado)

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

## Documentação da API

O Swagger UI serve como collection interativa completa das APIs, com todos os DTOs de entrada e resposta, formatos (`uuid`, `email`, `date`), enums, exemplos e códigos HTTP possíveis.

- **Swagger UI (interativo):** `http://localhost:3000/api` — permite executar cada endpoint direto do browser após autenticar via `Authorize` com o `accessToken` do login
- **OpenAPI JSON (para importar em Postman/Insomnia):** `http://localhost:3000/api-json`

## Documentação de arquitetura (RFC e ADR)

Decisões técnicas e arquiteturais relevantes da Fase 3 são registradas em Markdown:

- **[RFC-001 — Estratégia de autenticação](docs/rfc/RFC-001-estrategia-autenticacao.md):** modelo de autenticação dupla (funcionário por email/senha e cliente por CPF via função serverless), formato dos tokens, papéis/propriedade e integração com a Lambda e o SSM.
- **[ADR-001 — Ator da trilha de auditoria em ações de cliente](docs/adr/ADR-001-ator-trilha-auditoria.md):** por que o histórico de status registra o `usuarioCriadorId` (funcionário) quando a ação é do cliente, e o caminho de evolução.

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

## Testes

Cobertura atual: **313 testes unitários** (84 suites) + **59 testes end-to-end** (8 suites, com Postgres real via Testcontainers).

- Statements: **69.61%**
- Branches: **59.39%**
- Functions: **66.67%**

Relatório completo publicado em: [https://jest-test-coverage.vercel.app/](https://jest-test-coverage.vercel.app/)

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

## Infraestrutura (Fase 2)

### Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|---|---|---|
| Docker | 24+ | [docs.docker.com](https://docs.docker.com/get-docker/) |
| Kind | 0.27+ | `brew install kind` ou [kind.sigs.k8s.io](https://kind.sigs.k8s.io/) |
| Terraform | 1.6+ | [developer.hashicorp.com/terraform](https://developer.hashicorp.com/terraform/install) |
| kubectl | qualquer | `brew install kubectl` |

---

### 1. Desenvolvimento local (docker-compose)

O jeito mais rápido de subir o banco e a aplicação localmente:

```bash
# Sobe o PostgreSQL 17
docker compose up -d

# Copia variáveis de ambiente
cp .env.example .env

# Aplica migrations e inicia a API em modo watch
npx prisma migrate dev
npm run start:dev
```

Swagger UI disponível em `http://localhost:3000/api`.

---

### 2. Provisionar o cluster Kind com Terraform

```bash
cd infra

# Baixa o provider tehcyx/kind
terraform init

# Cria o cluster (1 control-plane + 2 workers)
terraform apply

# Verificar os nós
kubectl get nodes
```

Para destruir o cluster:

```bash
terraform destroy
```

#### Variáveis disponíveis

| Variável | Padrão | Descrição |
|---|---|---|
| `cluster_name` | `oficina-cluster` | Nome do cluster Kind |
| `app_host_port` | `3000` | Porta do host mapeada para a API |
| `db_host_port` | `5432` | Porta do host mapeada para o PostgreSQL |

Exemplo sobrescrevendo a porta da aplicação:

```bash
terraform apply -var="app_host_port=8080"
```

---

### 3. Aplicar os manifestos Kubernetes

```bash
# Namespace
kubectl apply -f k8s/00-namespace.yaml

# Banco de dados (StatefulSet + Services + Secret)
kubectl apply -f k8s/postgres/
kubectl rollout status statefulset/postgres -n oficina --timeout=180s

# ConfigMap e Secrets da aplicação
kubectl apply -f k8s/app/01-configmap.yaml
kubectl apply -f k8s/app/02-secret.yaml

# Migrations (Job one-shot)
export IMAGE_TAG="ghcr.io/<org>/<repo>:latest"
sed "s|IMAGE_PLACEHOLDER|${IMAGE_TAG}|g" k8s/app/03-migration-job.yaml | kubectl apply -f -
kubectl wait --for=condition=complete job/db-migration -n oficina --timeout=120s

# Deployment + Service + HPA
sed "s|IMAGE_PLACEHOLDER|${IMAGE_TAG}|g" k8s/app/04-deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/app/05-service.yaml
kubectl apply -f k8s/app/06-hpa.yaml

# Verificar pods
kubectl get pods -n oficina
```

A API ficará acessível em `http://localhost:3000/api` (via NodePort mapeado pelo Kind).

---

### 4. Métricas e HPA

O HPA exige o **Metrics Server** no cluster. Para Kind (certificado auto-assinado), instale com:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch necessário para Kind aceitar TLS do kubelet
kubectl patch deployment metrics-server -n kube-system \
  --type='json' \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

Verificar se o HPA está funcionando:

```bash
kubectl get hpa -n oficina
```

#### Simular carga para acionar o HPA (vídeo demonstrativo)

```bash
# Instale o hey (ferramenta de carga HTTP)
go install github.com/rakyll/hey@latest

# Gera 500 requisições simultâneas por 60 segundos
hey -z 60s -c 100 http://localhost:3000/api

# Em outro terminal, observe o HPA escalar os pods
kubectl get hpa oficina-api-hpa -n oficina -w
kubectl get pods -n oficina -w
```

---

### 5. Imagem Docker

```bash
# Build local
docker build -t oficina-api:local .

# Carregar no cluster Kind para uso sem registry
kind load docker-image oficina-api:local --name oficina-cluster
```

---

### 6. Pipelines CI e CD (GitHub Actions)

O projeto separa **Continuous Integration** e **Continuous Delivery** em dois workflows dedicados dentro de `.github/workflows/`. Cada arquivo tem seu próprio bloco `concurrency` que cancela runs anteriores da mesma branch/PR quando um novo commit chega. Todas as actions estão pinadas por SHA completo (segurança supply chain) nas versões que declaram `node24`.

#### `ci.yml` — Continuous Integration

Feedback rápido de validação para cada mudança de código.

| Aspecto | Valor |
|---|---|
| **Trigger** | `push` e `pull_request` em `main` e `develop` |
| **Job** | `Build & Test` — `npm ci` → `npx prisma generate` → `npm test` (300 unit tests) → `npm run build` |
| **Duração média** | ~1 min |

#### `cd.yml` — Continuous Delivery

Empacota e entrega a aplicação no cluster.

| Aspecto | Valor |
|---|---|
| **Trigger** | `push` em `main` e `develop` (não roda em PR) |
| **Jobs encadeados** | `test` (guard) → `docker` → `deploy` |
| **Duração média** | ~10 min |

**Estágios do `cd.yml`:**

| Estágio | O que faz |
|---|---|
| **Build & Test (guard)** | Repete a validação do CI antes de empacotar, garantindo que um push com testes quebrados nunca produza imagem publicada nem chegue ao cluster |
| **Docker Image** | `docker/setup-buildx-action` → login no GHCR → build multi-stage com fix Prisma `.ts` imports → push com tag `sha-<hash>` (+ `latest` só na branch default) → cache GHA |
| **Deploy to Kind** | Instala Kind + kubectl + Terraform → `terraform apply` provisiona o cluster → `kind load docker-image` → Metrics Server + `--kubelet-insecure-tls` → `kubectl apply` postgres com `rollout status` → Job de migration → `kubectl apply` deployment/service/HPA → **Smoke test em 16 verificações end-to-end** (login, CRUDs, decremento atômico de estoque, máquina de estados completa, filtro Fase 2, webhook externo com token do secret, HPA provisionado, réplicas ativas) |

Se qualquer step do estágio Deploy falhar, um step `if: failure()` executa **Diagnose cluster state on failure**, dumpando `kubectl get all`, `kubectl describe pods`, eventos e logs (atuais e previous) do namespace `oficina` — evita ter que reproduzir localmente.

#### Comportamento por evento

| Evento | ci.yml | cd.yml |
|---|:---:|:---:|
| Pull request para `main`/`develop` | ✅ roda | ⏭ não dispara |
| Push (merge) em `main`/`develop` | ✅ roda | ✅ roda |

Os dois rodam em paralelo no push, cada um com sua própria responsabilidade.

| Secret | Descrição |
|---|---|
| `GITHUB_TOKEN` | Fornecido automaticamente pelo GitHub Actions — usado para publicar a imagem no GHCR |

> **Nota:** As credenciais em `k8s/app/02-secret.yaml` e `k8s/postgres/01-secret.yaml` são valores placeholder versionados no repo.
