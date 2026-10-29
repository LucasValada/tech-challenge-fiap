# Infraestrutura do OS Service

Terraform dos recursos AWS que pertencem a este serviço:

- Fila `oficina-os-saga-replies` (respostas da Saga) e a DLQ `oficina-os-saga-replies-dlq` (`sqs.tf`)
- Política de acesso anexada à role dos nós do EKS: consumir a própria fila e publicar em `oficina-execution-commands` e `oficina-billing-commands` (`iam.tf`)
- Token das rotas `/internal` (`random_password`), guardado só no SSM em `/tc3-oficina/homolog/INTERNAL_API_TOKEN` (`ssm.tf`). O CD do OS monta o Secret do Kubernetes a partir dele, e a Lambda de autenticação (`tc3-auth-lambda`) lê o mesmo parâmetro para chamar `POST /internal/clientes/busca`
- **Banco do OS** (`rds.tf`): RDS PostgreSQL `oficina-os-db` (`db.t4g.micro`, subnet privada, storage criptografado), com security group que só aceita conexões dos nós do EKS. A connection string e os dados de acesso ficam no SSM, com os mesmos nomes da Fase 3: `DATABASE_URL` (lido pelo CD), `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD`
- **Monitoria do banco** (`newrelic-postgres.tf`): o agente `nri-postgresql` roda no cluster, no namespace `newrelic`, e consulta o banco direto, sem CloudWatch. Um Job cria antes o usuário de leitura (`pg_monitor`), com a senha em `DB_MONITOR_PASSWORD`. As amostras levam as tags `environment` e `project`, pelas quais os alertas e o dashboard de banco de `tc3-infra-k8s` filtram

Até a Fase 3, o banco ficava no repositório `tc3-infra-db`. Ele veio para cá para que cada serviço tenha fila, banco e permissões no próprio repositório. A imagem continua no ECR de `tc3-infra-k8s`.

## Dependências e ordem

A VPC, o cluster e o security group dos nós vêm de [`tc3-infra-k8s`](https://github.com/tiagostorch/tc3-infra-k8s), lidos pelo state remoto; a license key do New Relic vem do SSM, publicada por ele. O agente do banco é criado no cluster, então o Terraform fala também com o Kubernetes (provider `kubernetes`, autenticado com `aws eks get-token`). Por isso:

- **apply:** depois de `tc3-infra-k8s`, com o cluster no ar;
- **destroy:** antes de `tc3-infra-k8s` e com o cluster ainda no ar, porque a AWS não apaga a role dos nós com a política deste serviço anexada e o agente do banco precisa ser removido do cluster.

Na prática, quem aplica e destrói é o workflow **Ambiente** de `tc3-infra-k8s`, já nessa ordem.

## Comandos

```bash
cd terraform
terraform init -backend-config="bucket=tc3-tfstate-oficina-539820"
terraform plan  -var="state_bucket=tc3-tfstate-oficina-539820"
terraform apply -var="state_bucket=tc3-tfstate-oficina-539820"
```

O state fica em `os-service/terraform.tfstate`, no mesmo bucket das stacks da Fase 3. Rodar localmente exige o AWS CLI, usado pelo provider `kubernetes` para obter o token do cluster.
