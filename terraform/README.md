# Infraestrutura do OS Service

Terraform dos recursos AWS que pertencem a este serviço:

- Fila `oficina-os-saga-replies` (respostas da Saga) e a DLQ `oficina-os-saga-replies-dlq`
- Política de acesso anexada à role dos nós do EKS: consumir a própria fila e publicar em `oficina-execution-commands` e `oficina-billing-commands`

O banco do OS continua em [`tc3-infra-db`](https://github.com/tiagostorch/tc3-infra-db), que cuida só dele, e a imagem continua no ECR de `tc3-infra-k8s`.

## Dependências e ordem

A VPC e o cluster vêm de [`tc3-infra-k8s`](https://github.com/tiagostorch/tc3-infra-k8s), lidos pelo state remoto. Por isso:

- **apply:** depois de `tc3-infra-k8s`;
- **destroy:** antes de `tc3-infra-k8s`, porque a AWS não apaga a role dos nós com esta política ainda anexada.

## Comandos

```bash
cd terraform
terraform init -backend-config="bucket=tc3-tfstate-oficina-539820"
terraform plan  -var="state_bucket=tc3-tfstate-oficina-539820"
terraform apply -var="state_bucket=tc3-tfstate-oficina-539820"
```

O state fica em `os-service/terraform.tfstate`, no mesmo bucket das stacks da Fase 3.
