# Tech Challenge FIAP - SOAT Oficina

Sistema de gerenciamento de oficina mecânica desenvolvido para o Tech Challenge FIAP SOAT. API back-end para gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com autenticação JWT, envio de orçamento por email, acompanhamento público de OS e infraestrutura provisionada via Terraform + Kubernetes.

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

> _Em breve._ Vídeo (YouTube, não listado, até 15 minutos) cobrindo deploy da aplicação, execução do CI/CD, consumo das APIs e escalabilidade automática do HPA sob carga.

**Link:** _a ser adicionado_

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

Os dois diagramas a seguir seguem a notação [C4 Model](https://c4model.com/): o primeiro no nível **Container** mostra a aplicação como uma unidade e seus vizinhos (banco, SMTP, consumidores), e o segundo no nível **Component** faz o zoom dentro da Oficina API para revelar as quatro camadas da Clean Architecture.

#### Diagrama C4 — nível Container

```mermaid
C4Container
    title Container Diagram — Sistema Oficina

    Person(cliente, "Cliente HTTP", "Consumo via Swagger UI, curl ou Postman com JWT")
    Person(clientePublico, "Consumidor público", "Acessa /public/ordens-servico sem autenticação")
    System_Ext(webhookExterno, "Sistema Externo de Aprovação", "Envia decisão de orçamento via POST /webhooks/orcamento com X-Webhook-Token")

    System_Boundary(oficina, "Sistema Oficina") {
        Container(api, "Oficina API", "NestJS 11 / Node 24", "Gestão de OS, clientes, veículos, serviços e itens de estoque")
        ContainerDb(db, "PostgreSQL 17", "Banco relacional", "Persistência via Prisma 7 com pg driver adapter")
    }

    System_Ext(smtp, "SMTP Ethereal", "Servidor SMTP falso para emails de orçamento, finalização e entrega em ambiente de desenvolvimento")

    Rel(cliente, api, "HTTPS / REST", "JSON + Bearer JWT")
    Rel(clientePublico, api, "HTTPS / REST", "código da OS + placa")
    Rel(webhookExterno, api, "POST /webhooks/orcamento", "JSON + X-Webhook-Token")
    Rel(api, db, "reads/writes", "TCP 5432 via Prisma")
    Rel(api, smtp, "envia emails de orçamento, finalização e entrega", "SMTP 587")
```

#### Diagrama C4 — nível Component

Zoom dentro do Container **Oficina API** mostrando as quatro camadas da Clean Architecture. As relações rotuladas como **implementa** representam a inversão de dependência: os adapters de infra implementam interfaces expostas pelo domain, e não o contrário.

```mermaid
C4Component
    title Component Diagram — Oficina API (Clean Architecture)

    Person(cliente, "Cliente HTTP", "Consumo autenticado ou público")

    Container_Boundary(api, "Oficina API — NestJS") {

        Boundary(interfaceLayer, "Camada Interface — src/modules/<m>/interface") {
            Component(controllers, "Controllers + Guards", "NestJS Controller", "JwtAuthGuard, WebhookTokenGuard")
            Component(dtos, "DTOs de entrada e resposta", "class-validator", "Validação declarativa de payload")
        }

        Boundary(applicationLayer, "Camada Application — src/modules/<m>/application") {
            Component(useCases, "Use Cases", "@Injectable NestJS", "1 classe = 1 responsabilidade, método execute")
            Component(mappers, "Mappers de resposta", "TypeScript", "toUserResponse etc")
            Component(shared, "Shared helpers", "TypeScript", "traduzirErroDominio, etc")
        }

        Boundary(domainLayer, "Camada Domain — src/modules/<m>/domain") {
            Component(entities, "Entities", "Classes puras", "OrdemServico, Cliente, Veiculo etc")
            Component(domainSvc, "Domain Services", "Funções puras", "garantirCpfCnpjUnico, buscarClienteOuFalhar, maquinaDeEstadosOS, calcularTotaisOS")
            Component(repos, "Repository & Adapter Interfaces (ports) + Errors tipados", "Contratos TS", "Cliente/Veiculo/OS/User Repository (persistência) + EmailSender, PasswordHasher, TokenIssuer (adapters)")
        }

        Boundary(moduleInfra, "Adapters por módulo — src/modules/<m>/infra") {
            Component(bcrypt, "BcryptPasswordHasher", "bcrypt", "auth/infra e user/infra")
            Component(jwt, "JwtTokenIssuer", "@nestjs/jwt", "auth/infra")
            Component(mailer, "NestMailerEmailSender", "@nestjs-modules/mailer", "mail/infra, provider EMAIL_SENDER")
        }

        Boundary(sharedInfra, "Infra compartilhada — src/infra e src/modules/prisma") {
            Component(prismaSvc, "PrismaService", "pg.Pool + PrismaPg adapter", "Bootstrap do Prisma Client")
            Component(prismaRepos, "Prisma Repositories", "Prisma Client 7", "src/infra/database/prisma/repositories")
        }
    }

    ContainerDb(db, "PostgreSQL 17", "Banco relacional")
    System_Ext(smtp, "SMTP Ethereal", "Emails de dev")

    Rel(cliente, controllers, "HTTPS / REST")
    Rel(controllers, dtos, "valida entrada")
    Rel(controllers, useCases, "invoca")
    Rel(useCases, domainSvc, "usa")
    Rel(useCases, repos, "depende de contratos")
    Rel(useCases, mappers, "usa")
    Rel(useCases, shared, "usa")
    Rel(domainSvc, entities, "opera sobre")

    Rel(prismaRepos, repos, "implementa")
    Rel(bcrypt, repos, "implementa (PasswordHasher)")
    Rel(jwt, repos, "implementa (TokenIssuer)")
    Rel(mailer, repos, "implementa (EmailSender)")

    Rel(prismaRepos, prismaSvc, "usa Prisma Client")
    Rel(prismaSvc, db, "TCP 5432", "pg driver")
    Rel(mailer, smtp, "envia email", "SMTP 587")
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

    subgraph CI[ci.yml - Continuous Integration<br/>dispara em push e pull_request]
        CIJob[Build and Test<br/>npm ci<br/>prisma generate<br/>npm test - 300 unitários<br/>npm run build]
    end

    subgraph CD[cd.yml - Continuous Delivery<br/>dispara apenas em push]
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

A API usa **JWT (JSON Web Token)** para proteger os endpoints administrativos.

```bash
# Login (retorna accessToken)
POST /auth/login
{
  "email": "admin@oficina.com",
  "senha": "senha123"
}
```

Use o token retornado no header `Authorization: Bearer <token>` nas demais requisições.

O usuário admin padrão é criado automaticamente pela migration `seed_admin_user` ao aplicar as migrations.

## Documentação da API

O Swagger UI serve como collection interativa completa das APIs, com todos os DTOs de entrada e resposta, formatos (`uuid`, `email`, `date`), enums, exemplos e códigos HTTP possíveis.

- **Swagger UI (interativo):** `http://localhost:3000/api` — permite executar cada endpoint direto do browser após autenticar via `Authorize` com o `accessToken` do login
- **OpenAPI JSON (para importar em Postman/Insomnia):** `http://localhost:3000/api-json`

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

### Ordens de Serviço (JWT)
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

### Acompanhamento Público (sem JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/ordens-servico/:codigo?placa=` | Consultar OS pelo código e placa (dupla checagem) |
| POST | `/public/ordens-servico/:codigo/aprovar` | Cliente aprova o orçamento (transiciona `AGUARDANDO_APROVACAO` → `EM_EXECUCAO`) |

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
3. **AGUARDANDO_APROVACAO:** orçamento enviado ao cliente por email (endpoint `enviar-orcamento`) ou aguardando decisão via webhook externo
4. **EM_EXECUCAO:** cliente aprova o orçamento (endpoint público `aprovar`, webhook externo com `aprovado: true`, ou avanço manual pelo admin)
5. **FINALIZADA:** serviço concluído (email automático ao cliente com `finalizadaAt`)
6. **ENTREGUE:** veículo devolvido ao cliente (email automático de confirmação com `entregueAt`)

Cada transição registra um `HistoricoStatusOS` com data, usuário e observação. Envios de email são best-effort: uma falha do SMTP não bloqueia a transição de status.

## Testes

Cobertura atual: **300 testes unitários** (82 suites) + **56 testes end-to-end** (8 suites, com Postgres real via Testcontainers).

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
