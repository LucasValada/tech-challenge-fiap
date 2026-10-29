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

# ─── Banco (rds.tf) ─────────────────────────────────────────────────────────

variable "db_name" {
  type    = string
  default = "oficina_db"
}

variable "db_username" {
  type    = string
  default = "oficina_user"
}

variable "db_engine_version" {
  description = <<-EOT
    Apenas a major. O RDS escolhe a minor suportada no momento da criação:
    fixar a minor quebra o apply quando ela sai de linha.
  EOT
  type        = string
  default     = "17"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

# ─── Monitoria do banco no New Relic (newrelic-postgres.tf) ────────────────

variable "newrelic_namespace" {
  description = "Namespace criado por tc3-infra-k8s onde os componentes do New Relic vivem."
  type        = string
  default     = "newrelic"
}

variable "db_monitor_user" {
  description = <<-EOT
    Usuário de leitura usado pelo nri-postgresql. Criado por um Job de bootstrap
    com `pg_monitor`: enxerga as visões `pg_stat_*` e não lê dado de negócio.
  EOT
  type        = string
  default     = "newrelic_monitor"
}

variable "newrelic_infra_bundle_tag" {
  description = "Tag da imagem `newrelic/infrastructure-bundle`, que traz o nri-postgresql."
  type        = string
  default     = "latest"
}

variable "newrelic_tags" {
  description = <<-EOT
    Tags padrão do projeto, aplicadas em toda amostra do agente de banco
    (NRIA_CUSTOM_ATTRIBUTES). Os dashboards e alertas de banco em tc3-infra-k8s
    filtram por elas: os valores precisam ser os mesmos de `newrelic_tags` lá.
  EOT
  type        = map(string)
  default = {
    environment = "production"
    project     = "tech-challenge-fiap"
  }

  validation {
    condition     = alltrue([for chave in ["environment", "project"] : contains(keys(var.newrelic_tags), chave)])
    error_message = "newrelic_tags precisa conter as chaves 'environment' e 'project'."
  }
}

variable "newrelic_postgres_interval" {
  description = "Intervalo de coleta do banco; 30s acompanha o lowDataMode do agente de Kubernetes."
  type        = string
  default     = "30s"
}
