# RFC-003 — Escolha do banco de dados e ajustes no modelo relacional

| | |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |
| **Autores** | Equipe SOAT Oficina |
| **Repositórios afetados** | `fase3-app` (schema/migrations), `fase3-infra-database` (RDS) |
| **Relacionados** | [RFC-002 — Escolha da nuvem](RFC-002-escolha-da-nuvem.md), [ADR-001 — Ator da trilha de auditoria](../adr/ADR-001-ator-trilha-auditoria.md) |

## 1. Contexto e problema

O domínio da oficina é **fortemente relacional**: ordens de serviço ligam clientes, veículos, serviços, itens de estoque e um histórico de status; operações como a baixa de estoque ao adicionar um item precisam ser **atômicas**. A Fase 2 usava PostgreSQL **rodando dentro do cluster** (StatefulSet). A Fase 3 exige um **banco gerenciado** e pede também **"melhorar e documentar a modelagem, garantindo consistência e performance"**.

Duas decisões, portanto: **qual motor de banco** e **qual serviço gerenciado**, além de **quais ajustes** o modelo relacional recebeu.

## 2. Decisão

**Motor: PostgreSQL. Serviço: Amazon RDS for PostgreSQL** (gerenciado, provisionado por Terraform em `fase3-infra-database`).

### 2.1 Por que PostgreSQL
- **Integridade referencial + transações ACID:** foreign keys e transações garantem consistência em operações como a baixa atômica de estoque e a atualização de totais da OS.
- **Tipos nativos que o domínio usa:** `UUID` (chaves), `DECIMAL(10,2)` (valores monetários sem erro de ponto flutuante), `ENUM` (status da OS e do cliente, tipo de item) e `TIMESTAMP` com fuso.
- **Consultas analíticas:** o relatório de tempo médio por status usa agregações que o PostgreSQL executa com eficiência.
- **Ecossistema + Prisma 7:** integração consolidada via driver adapter `@prisma/adapter-pg`, com migrations versionadas.

### 2.2 Por que RDS (gerenciado)
- **Operação delegada:** backups automáticos, patching, métricas (Performance Insights) e logs no CloudWatch, sem gerenciar StatefulSet/PVC.
- **Endpoint único e estável** publicado no SSM, consumido pela app e pela Lambda.
- **Segurança de rede:** fica em **subnet privada**, inalcançável da internet; o Security Group libera a porta 5432 só a partir do Security Group dos nós do EKS. Conexão via **TLS** (`rds.force_ssl`), validada contra a CA do RDS pela aplicação.
- **Escalável:** troca de classe de instância / storage sem reescrever a aplicação.

## 3. Ajustes no modelo relacional (o "melhorar" da fase)

| Ajuste | O quê | Motivo |
|---|---|---|
| **Campo `status` em `Cliente`** | Enum `StatusCliente { ATIVO, INATIVO }`, default `ATIVO` | A autenticação por CPF (Lambda) precisa checar se o cliente está **ativo** antes de emitir o token. Sem o campo, a Lambda não conseguiria negar acesso a cliente inativo. |
| **Snapshots imutáveis nas linhas da OS** | `OSServicos` e `OSItemEstoque` guardam `nomeSnapshot` e `precoUnitario` no momento da inclusão | Preserva o valor histórico da OS mesmo que o preço/descrição do catálogo mude depois — consistência do que foi efetivamente orçado/cobrado. |
| **Trilha de status dedicada** | `HistoricoStatusOS` (status, usuário, observação, timestamp) por transição | Auditoria cronológica e base para o relatório de **tempo médio por status**. (Ver [ADR-001](../adr/ADR-001-ator-trilha-auditoria.md) sobre o ator registrado.) |
| **Numeração sequencial anual** | Tabela `OSCodigoCounter` (ano → contador) | Gera códigos legíveis e únicos por ano (`OS-2026-000001`) de forma transacional, sem colisão sob concorrência. |
| **Políticas de exclusão explícitas** | `onDelete: Restrict` nas referências de cadastro (cliente, veículo, serviço, item, usuário) e `Cascade` nas linhas filhas da OS | Impede apagar um cadastro que ainda tem OS/veículo apontando para ele, mas permite remover uma OS levando junto suas linhas e histórico. |
| **Unicidades de negócio** | `@unique` em `Cliente.cpfCnpj`, `Veiculo.placa`, `ItemEstoque.sku`, `Usuario.email`, `OrdemServico.codigo` | Consistência de identidade e performance de busca (índice único). |

O **diagrama ER completo e a explicação de cada relacionamento** estão documentados no [README](../../README.md#modelo-de-dados-diagrama-er) da aplicação.

## 4. Alternativas consideradas

- **MySQL / MariaDB gerenciado (RDS):** relacional e viável, mas o suporte a `ENUM`/tipos e o ferramental do PostgreSQL com Prisma são mais confortáveis para a equipe. Descartado por preferência técnica, não por impedimento.
- **SQL Server (RDS/Azure):** custo de licenciamento e menor aderência ao ecossistema aberto do projeto. Descartado.
- **NoSQL (DynamoDB / MongoDB):** o domínio é relacional com integridade referencial forte e transações multi-tabela (baixa de estoque + totais + histórico). Modelar isso em NoSQL exigiria desnormalização e consistência aplicacional — mais risco, menos garantia. Descartado.

## 5. Consequências

### Positivas
- Consistência forte (FK + transações) para as operações críticas do domínio.
- Operação do banco delegada ao RDS; a aplicação só consome um endpoint via TLS.
- Modelo documentado (ER + relacionamentos) e "melhorado" com o campo `status`, snapshots e políticas de exclusão explícitas.

### Negativas / riscos
- **RDS single-AZ** no escopo atual (custo): a HA do banco depende de habilitar multi-AZ — evolução de infraestrutura.
- **Acoplamento ao PostgreSQL** via tipos específicos (`ENUM`, `DECIMAL`) — troca de motor exigiria ajustes de schema; aceitável dada a decisão de padronizar em Postgres.
