terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.35"
    }
  }
}

# O agente que monitora o banco (newrelic-postgres.tf) roda dentro do cluster:
# o endereço e a senha do banco só existem aqui, então é daqui que ele é criado.
provider "kubernetes" {
  host                   = data.aws_eks_cluster.principal.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.principal.certificate_authority[0].data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", data.aws_eks_cluster.principal.name, "--region", var.aws_region]
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = var.project_name
      Ambiente  = var.environment
      ManagedBy = "terraform"
      Stack     = "os-service"
    }
  }
}
