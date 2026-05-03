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

## Instalação e execução local

```bash
# 1. Clonar o repositório
git clone https://github.com/LucasValada/tech-challenge-fiap.git
cd tech-challenge-fiap

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (ver seção abaixo)

# 4. Subir o banco PostgreSQL
# Nota: Se já tiver uma instancia rodando na máquina, altere as portas conforme necessário no env e dockerfile
docker compose up postgres -d

# 5. Aplicar migrations
npx prisma migrate deploy

# 6. Popular o banco com o usuário admin padrão
npx prisma db seed

# 4. Subir a API
docker compose up api -d
```

A API estará disponível em `http://localhost:3000`.
A documentação Swagger estará em `http://localhost:3000/api`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | String de conexão PostgreSQL (`postgresql://user:pass@host:5432/db?schema=public`) |
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

O usuário admin padrão é criado pelo seed (`npx prisma db seed`).

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
