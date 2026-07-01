# Tech Challenge FIAP - SOAT Oficina

Sistema de gerenciamento de oficina mecânica desenvolvido como MVP (Fase 1) do Tech Challenge FIAP SOAT. API back-end para gestão de clientes, veículos, serviços, peças/insumos e ordens de serviço, com autenticação JWT, envio de orçamento por email e acompanhamento público de OS.

## Objetivos

- Substituir o controle manual por planilhas por um sistema integrado
- Permitir criação e acompanhamento de ordens de serviço com fluxo de status completo (RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE)
- Gerar orçamentos automaticamente com base nos serviços e peças incluídos na OS
- Enviar orçamento ao cliente por email para aprovação
- Permitir que o cliente acompanhe e aprove a OS via API pública (sem autenticação)
- Controlar estoque de peças e insumos com alerta de estoque mínimo
- Monitorar tempo médio de execução dos serviços

## Justificativa do banco de dados

**PostgreSQL** foi escolhido por:

- **Integridade referencial**: o domínio possui múltiplas entidades com relacionamentos complexos (OS → Cliente, Veículo, Serviços, Itens, Histórico). O PostgreSQL garante consistência com foreign keys e transações ACID, essencial para operações atômicas como baixa de estoque ao adicionar itens na OS.
- **Tipos nativos**: suporte a `UUID`, `DECIMAL` (valores monetários), `ENUM` (status da OS, tipo de item) e `TIMESTAMP WITH TIME ZONE` sem necessidade de workarounds.
- **Desempenho em consultas analíticas**: o relatório de tempo médio de execução usa agregações que o PostgreSQL lida com eficiência.
- **Ecossistema maduro**: integração consolidada com Prisma 7 (via driver adapter `@prisma/adapter-pg`), ampla documentação e suporte da comunidade.
- **Custo zero**: open source, sem licenciamento, ideal para MVP acadêmico.

## Stack

| Tecnologia | Versão |
|---|---|
| Node.js | 24.x |
| NestJS | 11.x |
| Prisma | 7.x |
| PostgreSQL | 17 |
| Docker / Docker Compose | 29.x / 5.x |

## Pré-requisitos

- Node.js 24+
- npm 11+
- Docker e Docker Compose

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

A API estará disponível em `http://localhost:3000`.
A documentação Swagger estará em `http://localhost:3000/api`.

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

## Endpoints da API

### Auth
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Autenticação (retorna JWT) |

### Usuários (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/user` | Listar todos |
| GET | `/user/:id` | Buscar por ID |
| POST | `/user` | Criar (senha gerada automaticamente) |
| PUT | `/user/:id` | Atualizar |
| DELETE | `/user/:id` | Deletar |

### Clientes (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/cliente` | Listar todos |
| GET | `/cliente/:id` | Buscar por ID |
| POST | `/cliente` | Criar (com validação de CPF/CNPJ) |
| PUT | `/cliente/update/:id` | Atualizar |
| DELETE | `/cliente/delete/:id` | Deletar |

### Veículos (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/veiculos` | Listar todos |
| GET | `/veiculos/:id` | Buscar por ID |
| POST | `/veiculos` | Criar (com validação de placa) |
| PUT | `/veiculos/:id` | Atualizar |
| DELETE | `/veiculos/:id` | Deletar |

### Serviços (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/servicos` | Listar todos |
| GET | `/servicos/:id` | Buscar por ID |
| POST | `/servicos` | Criar |
| PUT | `/servicos/:id` | Atualizar |
| DELETE | `/servicos/:id` | Deletar |

### Itens de Estoque (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/itens-estoque` | Listar (filtro opcional por tipo: PECA/INSUMO) |
| GET | `/itens-estoque/baixo-estoque` | Listar itens abaixo do estoque mínimo |
| GET | `/itens-estoque/:id` | Buscar por ID |
| POST | `/itens-estoque` | Criar |
| PUT | `/itens-estoque/:id` | Atualizar |
| DELETE | `/itens-estoque/:id` | Deletar |

### Ordens de Serviço (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico` | Listar todas |
| GET | `/ordens-servico/:id` | Buscar por ID (com detalhes, linhas e histórico) |
| POST | `/ordens-servico` | Criar (por CPF/CNPJ + placa, com serviços e peças opcionais) |
| PUT | `/ordens-servico/:id` | Atualizar observações |
| DELETE | `/ordens-servico/:id` | Deletar |
| POST | `/ordens-servico/:id/servicos` | Adicionar serviço à OS |
| PUT | `/ordens-servico/:id/servicos/:linhaId` | Atualizar quantidade de serviço |
| DELETE | `/ordens-servico/:id/servicos/:linhaId` | Remover serviço da OS |
| POST | `/ordens-servico/:id/itens-estoque` | Adicionar item de estoque (com baixa atômica) |
| PUT | `/ordens-servico/:id/itens-estoque/:linhaId` | Atualizar quantidade de item |
| DELETE | `/ordens-servico/:id/itens-estoque/:linhaId` | Remover item (restitui estoque) |
| POST | `/ordens-servico/:id/enviar-orcamento` | Enviar orçamento ao cliente por email |
| POST | `/ordens-servico/:id/transicao-status` | Transicionar status (com validação) |

### Acompanhamento Público (sem JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/public/ordens-servico/:codigo?placa=` | Consultar OS pelo código e placa |
| POST | `/public/ordens-servico/:codigo/aprovar` | Cliente aprova o orçamento |

### Relatórios (JWT)
| Método | Rota | Descrição |
|---|---|---|
| GET | `/ordens-servico/relatorios/tempo-medio-servicos` | Tempo médio de execução por serviço |

## Fluxo da Ordem de Serviço

```
RECEBIDA → EM_DIAGNOSTICO → AGUARDANDO_APROVACAO → EM_EXECUCAO → FINALIZADA → ENTREGUE
```

1. **RECEBIDA**: OS criada com cliente (CPF/CNPJ) e veículo (placa)
2. **EM_DIAGNOSTICO**: mecânico avalia e adiciona serviços/peças necessários
3. **AGUARDANDO_APROVACAO**: orçamento enviado ao cliente por email (endpoint `enviar-orcamento`)
4. **EM_EXECUCAO**: cliente aprova o orçamento (endpoint público `aprovar`)
5. **FINALIZADA**: serviço concluído
6. **ENTREGUE**: veículo devolvido ao cliente

Cada transição registra um `HistoricoStatusOS` com data, usuário e observação.

## Testes

```bash
# Todos os testes
npm test

# Com cobertura
npm run test:cov

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

> **Nota:** As credenciais em `k8s/app/02-secret.yaml` e `k8s/postgres/01-secret.yaml` são valores padrão para ambiente local. Em produção, substitua por segredos reais gerenciados externamente (ex: HashiCorp Vault, AWS Secrets Manager).
