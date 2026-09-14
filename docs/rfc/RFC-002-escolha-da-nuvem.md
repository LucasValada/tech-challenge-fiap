# RFC-002 — Escolha da nuvem

| | |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |
| **Autores** | Equipe SOAT Oficina |
| **Repositórios afetados** | Todos (`fase3-app`, `fase3-lambda-auth-cpf`, `fase3-infra-k8s`, `fase3-infra-database`) |
| **Relacionados** | [RFC-001 — Estratégia de autenticação](RFC-001-estrategia-autenticacao.md), [RFC-003 — Escolha do banco](RFC-003-escolha-do-banco.md), [ADR-002 — Uso de HPA](../adr/ADR-002-uso-de-hpa.md) |

## 1. Contexto e problema

A Fase 3 exige um conjunto de componentes de nuvem que precisam conversar entre si: **cluster Kubernetes** com escalabilidade, **banco de dados gerenciado**, **função serverless** para a autenticação por CPF, **API Gateway** para roteamento, **Terraform** para todo o provisionamento e um **CI/CD com deploy automático**. A escolha da nuvem é livre (AWS, GCP, Azure ou equivalente), mas a decisão precisa ser **única e coerente** entre os quatro repositórios, porque eles compartilham rede (VPC), segredos e identidade (OIDC).

O que se decide aqui: **qual provedor de nuvem** hospeda toda a solução.

## 2. Decisão

Adotar a **AWS** como provedor único para os quatro repositórios.

Mapeamento dos requisitos da fase para os serviços AWS:

| Requisito da fase | Serviço AWS | Onde é provisionado |
|---|---|---|
| Cluster Kubernetes escalável | **EKS** (Elastic Kubernetes Service) 1.3x | `fase3-infra-k8s` |
| Banco de dados gerenciado | **RDS PostgreSQL** | `fase3-infra-database` |
| Function Serverless (auth CPF) | **AWS Lambda** | `fase3-lambda-auth-cpf` |
| API Gateway | **Amazon API Gateway** (HTTP API v2) | `fase3-lambda-auth-cpf` |
| Registro de imagens | **Amazon ECR** | `fase3-infra-k8s` |
| Segredos compartilhados | **SSM Parameter Store** (SecureString) | infra + consumido pela app |
| Exposição da API | **ALB** via AWS Load Balancer Controller | `fase3-app` (Ingress) |
| Identidade do CI (sem chave estática) | **IAM + OIDC** (GitHub Actions) | `fase3-infra-k8s` (bootstrap) |
| Estado remoto do Terraform | **S3** (com lockfile) | `fase3-infra-k8s` (bootstrap) |

## 3. Justificativa

- **Cobertura completa dos requisitos com serviços gerenciados de primeira classe:** EKS, RDS, Lambda, API Gateway, ECR e SSM cobrem, um-a-um, cada item obrigatório da fase, sem precisar montar peças por conta própria.
- **Integração nativa entre os serviços:** a Lambda alcança o RDS pela mesma VPC; o API Gateway roteia para o ALB via VPC Link; o EKS puxa imagem do ECR pela IAM do node group; o CI assume papel por **OIDC** sem segredo estático. Menos "cola" manual entre componentes.
- **Terraform maduro para AWS:** os módulos `terraform-aws-modules/vpc` e `/eks` encurtam o provisionamento de VPC e cluster; o provider AWS é o mais estável e documentado.
- **Familiaridade da equipe** com o ecossistema AWS, reduzindo o custo de aprendizado dentro do prazo da fase.
- **Custo controlável para o escopo acadêmico:** instâncias pequenas (`t3.small` nos nós, `db.t4g.micro` no RDS), AWS Budget com alertas, e a possibilidade de `terraform destroy`/`apply` para ligar e desligar o ambiente.

## 4. Alternativas consideradas

### 4.1 GCP (GKE + Cloud SQL + Cloud Functions + API Gateway)
Equivalente funcional completo. **Descartada** por menor familiaridade da equipe e por o mapeamento OIDC/IAM e o VPC Link entre API Gateway e o balanceador serem menos diretos no nosso conhecimento atual — o ganho não justifica o custo de aprendizado no prazo.

### 4.2 Azure (AKS + Azure Database for PostgreSQL + Azure Functions + APIM)
Também cobre os requisitos. **Descartada** pela mesma razão (familiaridade) e porque o Azure API Management tende a ser mais pesado/caro do que o API Gateway HTTP API para o volume deste projeto.

### 4.3 Multi-nuvem (misturar provedores por componente)
Ex.: banco num provedor, cluster em outro. **Descartada de imediato:** quebra a integração por VPC/rede privada (o RDS ficaria exposto ou inalcançável pela Lambda/EKS), multiplica identidades e segredos, e contraria a coerência exigida entre os quatro repositórios.

## 5. Consequências

### Positivas
- Uma única conta, uma VPC, um plano de IAM — os quatro repositórios se integram por rede privada e SSM, sem expor o banco à internet.
- Deploy 100% por Terraform + CI/CD, reprodutível (infraestrutura como código).
- Serverless (Lambda) e gerenciado (RDS, EKS) reduzem operação manual.

### Negativas / riscos
- **Lock-in de provedor:** parte da solução usa serviços específicos da AWS (Lambda, API Gateway, SSM, ALB Controller). Mitigado por: o núcleo roda em **Kubernetes** (portável) e todo o provisionamento é **Terraform** (reescrevível para outra nuvem com esforço contido).
- **Custo por hora** do EKS/RDS mesmo ocioso. Mitigado por instâncias pequenas, AWS Budget com alertas e `destroy`/`apply` sob demanda.
- **RDS single-AZ** no escopo atual (custo) — a alta disponibilidade do banco é uma evolução de infraestrutura (multi-AZ), fora do escopo desta RFC.
