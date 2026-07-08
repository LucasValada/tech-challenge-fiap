# Tech Challenge FIAP - SOAT Oficina

Sistema de gerenciamento de oficina mecânica desenvolvido para o Tech Challenge FIAP SOAT. API back-end para gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com autenticação JWT, envio de orçamento por email, acompanhamento público de OS e infraestrutura provisionada via Terraform + Kubernetes.

## Índice

- [Objetivos](#objetivos)
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

## Clean Architecture

Todos os módulos de negócio (`auth`, `cliente`, `mail`, `item-estoque`, `ordem-servico`, `servico`, `user`, `veiculo`) seguem o mesmo padrão de Clean Architecture em 4 camadas, garantindo separação de responsabilidades e inversão de dependências:

```
src/modules/<módulo>/
├── interface/          → Controllers (HTTP), validações de entrada (DTOs), guards
├── application/        → Use cases (1 arquivo = 1 responsabilidade), mappers de resposta
├── domain/             → Entities (regras de negócio), Repository interfaces, Domain services puros
└── <módulo>.module.ts  → Wire-up NestJS (providers, imports, exports)

src/infra/database/prisma/repositories/
                        → Implementações concretas dos Repository interfaces
                          (adaptadores Prisma na camada infra, fora do módulo)
```

**Princípios aplicados:**

- **Inversão de dependência:** use cases dependem de `Repository` (interface no `domain`), nunca da implementação Prisma
- **Use case por classe:** cada use case é um `@Injectable` com um único método `execute()`
- **Domain services puros:** funções puras em `domain/services/` (ex.: `garantirCpfCnpjUnico`, `buscarClienteOuFalhar`) sem estado nem dependência de framework
- **Tokens de DI como string inline:** `@Inject('CLIENTE_REPOSITORY')` para desacoplar módulos
- **Snapshots imutáveis:** serviços e itens de estoque adicionados a uma OS ficam com nome e preço copiados no momento da inclusão, isolados de mudanças futuras no cadastro

## Arquitetura

### Componentes da aplicação

```mermaid
graph TB
    Client[Cliente HTTP<br/>Swagger UI / curl / Postman]

    subgraph Interface[Camada Interface]
        Controllers[Controllers + Guards<br/>JwtAuthGuard, WebhookTokenGuard]
        DTOs[DTOs de entrada e resposta<br/>com class-validator]
    end

    subgraph Application[Camada Application]
        UseCases[Use Cases<br/>1 classe = 1 responsabilidade]
        Mappers[Mappers de resposta<br/>toUserResponse etc]
        Shared[Shared helpers<br/>traduzirErroDominio]
    end

    subgraph Domain[Camada Domain]
        Entities[Entities<br/>OrdemServico, Cliente, Veiculo etc]
        DomainSvc[Domain Services puros<br/>garantirCpfCnpjUnico, buscarClienteOuFalhar<br/>maquinaDeEstadosOS, calcularTotaisOS]
        Repos[Repository Interfaces<br/>+ Errors tipados]
    end

    subgraph Infra[Camada Infra]
        PrismaRepos[Prisma Repositories<br/>implementam as interfaces do domain]
        EmailAdapter[NestMailer EmailSender<br/>implementa EmailSender do mail/domain]
        Hasher[BcryptPasswordHasher]
        Jwt[JwtTokenIssuer]
    end

    Client --> Controllers
    Controllers --> DTOs
    Controllers --> UseCases
    UseCases --> DomainSvc
    UseCases --> Repos
    UseCases --> Mappers
    UseCases --> Shared
    DomainSvc --> Entities
    Repos -.-> PrismaRepos
    PrismaRepos --> Postgres[(PostgreSQL 17)]
    UseCases -.-> EmailAdapter
    EmailAdapter --> SMTP[SMTP Ethereal]
    UseCases -.-> Hasher
    UseCases -.-> Jwt
```

### Infraestrutura provisionada

```mermaid
graph TB
    Host[Host localhost:3000]

    subgraph KindCluster[Kind Cluster provisionado por Terraform]
        subgraph ControlPlane[Control Plane]
            CP[oficina-cluster-control-plane<br/>extra_port_mappings 30080->3000, 30432->5432]
        end

        subgraph Workers[Workers]
            W1[oficina-cluster-worker]
            W2[oficina-cluster-worker2]
        end

        subgraph NamespaceOficina[Namespace oficina]
            HPA[HorizontalPodAutoscaler<br/>min 2, max 10<br/>CPU 70%, Memória 80%]
            Deploy[Deployment oficina-api<br/>2 réplicas com readiness/liveness]
            SvcApi[Service oficina-api<br/>NodePort 30080]
            SS[StatefulSet postgres<br/>1 réplica]
            PVC[PVC 5Gi<br/>volumeClaimTemplates]
            SvcPg[Service postgres<br/>ClusterIP + NodePort 30432]
            CM[ConfigMap app-config<br/>APPLICATION_PORT, MAIL_HOST etc]
            Sec[Secret app-secret<br/>DATABASE_URL, JWT_SECRET, MAIL_PASS etc]
            Job[Job db-migration<br/>prisma migrate deploy]
        end

        subgraph KubeSystem[Namespace kube-system]
            MS[Metrics Server<br/>--kubelet-insecure-tls]
        end

        HPA -.-> Deploy
        SvcApi --> Deploy
        SS --> PVC
        SvcPg --> SS
        Deploy -.->|envFrom| CM
        Deploy -.->|envFrom| Sec
        Deploy -.->|DATABASE_URL| SvcPg
        Job --> SvcPg
        MS -.->|coleta métricas| Deploy
    end

    Host -.->|host_port 3000| CP
    CP --- W1
    CP --- W2
```

### Fluxo de deploy

```mermaid
graph LR
    Dev[Developer<br/>push para main]
    GH[GitHub Actions<br/>ci-cd.yml]

    Dev --> GH

    subgraph Pipeline[Pipeline em 3 estágios]
        S1[Estágio 1 - Test<br/>npm ci<br/>prisma generate<br/>npm test<br/>npm run build]
        S2[Estágio 2 - Docker<br/>build imagem<br/>push para GHCR<br/>tag sha-xxx + latest]
        S3[Estágio 3 - Deploy Kind<br/>terraform apply<br/>kind load docker-image<br/>Metrics Server + patch TLS<br/>kubectl apply k8s/postgres<br/>Job de migration<br/>kubectl apply k8s/app<br/>smoke test /api]

        S1 --> S2 --> S3
    end

    GH --> S1
    S3 --> Cluster[Kind Cluster efêmero<br/>com aplicação de pé]
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
| Kubernetes | 1.35 (via Kind 0.32) |
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

Para o envio de email em desenvolvimento, crie uma conta gratuita em [ethereal.email](https://ethereal.email) e use as credenciais geradas.

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
kubectl wait --for=condition=ready pod -l app=postgres -n oficina --timeout=180s

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

### 6. Pipeline CI/CD (GitHub Actions)

O workflow `.github/workflows/ci-cd.yml` executa automaticamente em pushes para `main`:

| Estágio | O que faz |
|---|---|
| **Build & Test** | `npm ci` → `prisma generate` → `npm test` → `npm run build` |
| **Docker Image** | Constrói e publica no GitHub Container Registry (`ghcr.io`) |
| **Deploy to Kind** | `terraform apply` → carrega imagem no Kind → `kubectl apply` → valida rollout |

Para habilitar o pipeline, configure os seguintes segredos no repositório GitHub (Settings → Secrets):

| Secret | Descrição |
|---|---|
| `GITHUB_TOKEN` | Automático — usado para publicar a imagem no GHCR |

> **Nota:** As credenciais em `k8s/app/02-secret.yaml` e `k8s/postgres/01-secret.yaml` são valores padrão para ambiente local. Em produção, substitua por segredos reais gerenciados externamente (ex.: HashiCorp Vault, AWS Secrets Manager).
