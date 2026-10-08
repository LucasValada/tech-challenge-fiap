# A rede e o cluster nascem em tc3-infra-k8s; aqui só consumimos.
data "terraform_remote_state" "k8s" {
  backend = "s3"

  config = {
    bucket = var.state_bucket
    key    = "infra-k8s/terraform.tfstate"
    region = var.aws_region
  }
}

data "aws_caller_identity" "atual" {}

# Os pods recebem permissão de AWS pela role dos nós do EKS. Ela não é output de
# tc3-infra-k8s, e mudar aquele repositório dispara apply no cluster; como o
# cluster tem um único node group, a role é descoberta a partir dele.
data "aws_eks_node_groups" "cluster" {
  cluster_name = local.cluster_name
}

data "aws_eks_node_group" "principal" {
  cluster_name    = local.cluster_name
  node_group_name = one(data.aws_eks_node_groups.cluster.names)
}

locals {
  cluster_name   = data.terraform_remote_state.k8s.outputs.cluster_name
  node_role_name = basename(data.aws_eks_node_group.principal.node_role_arn)
  ssm_prefix     = "/${var.project_name}/${var.environment}"

  # Filas de outros serviços para as quais este publica. O ARN é montado pelo
  # nome (fixado em docs/contratos.md) para não acoplar os states dos serviços.
  filas_destino_arn = [
    for nome in ["oficina-execution-commands", "oficina-billing-commands"] :
    "arn:aws:sqs:${var.aws_region}:${data.aws_caller_identity.atual.account_id}:${nome}"
  ]
}
