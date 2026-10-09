variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  description = "Prefixo dos parâmetros SSM, o mesmo usado pela infraestrutura da Fase 3."
  type        = string
  default     = "tc3-oficina"
}

variable "environment" {
  type    = string
  default = "homolog"
}

variable "state_bucket" {
  description = "Bucket do state remoto — o mesmo criado no bootstrap de tc3-infra-k8s."
  type        = string
}
