# Banco próprio do OS (PostgreSQL, SQL): clientes, veículos, catálogo, estoque,
# ordens de serviço e o estado da Saga. Mesmo desenho do banco do Billing:
# subnet privada, storage criptografado e acesso só a partir dos nós do EKS.
#
# Até a Fase 3 este banco ficava em tc3-infra-db. Com ele aqui, cada serviço
# tem fila, banco e permissões no próprio repositório.

resource "aws_db_subnet_group" "os" {
  name       = "oficina-os-db"
  subnet_ids = local.private_subnet_ids
}

resource "aws_security_group" "os_db" {
  name        = "oficina-os-db"
  description = "Postgres do OS acessivel apenas dos nos do EKS"
  vpc_id      = local.vpc_id
}

resource "aws_vpc_security_group_ingress_rule" "dos_nos_eks" {
  security_group_id            = aws_security_group.os_db.id
  description                  = "Postgres a partir dos nos do EKS"
  referenced_security_group_id = local.node_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}

resource "random_password" "os_db" {
  length  = 32
  special = false # pontuação quebra o parsing da connection string do Prisma
}

resource "aws_db_instance" "os" {
  identifier = "oficina-os-db"

  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  db_name  = var.db_name
  username = var.db_username
  password = random_password.os_db.result

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_type          = "gp3"
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.os.name
  vpc_security_group_ids = [aws_security_group.os_db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = 1
  skip_final_snapshot     = true
  deletion_protection     = false

  # O log do Postgres não vai para o CloudWatch: a telemetria sai pelo
  # nri-postgresql (newrelic-postgres.tf). O Performance Insights é gratuito
  # nos 7 dias de retenção e mostra qual query está segurando a conexão.
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  apply_immediately = true
}

# Credencial só no SSM: nenhuma senha passa por secret do GitHub ou manifesto
# do Kubernetes. O CD lê o DATABASE_URL e monta o Secret do serviço. Os nomes
# são os mesmos de quando o banco ficava em tc3-infra-db.
resource "aws_ssm_parameter" "database_url" {
  name        = "${local.ssm_prefix}/DATABASE_URL"
  description = "Connection string do Prisma do OS"
  type        = "SecureString"
  value = format(
    "postgresql://%s:%s@%s:%s/%s?schema=public",
    var.db_username,
    random_password.os_db.result,
    aws_db_instance.os.address,
    aws_db_instance.os.port,
    var.db_name,
  )
}

resource "aws_ssm_parameter" "db_host" {
  name  = "${local.ssm_prefix}/DB_HOST"
  type  = "String"
  value = aws_db_instance.os.address
}

resource "aws_ssm_parameter" "db_port" {
  name  = "${local.ssm_prefix}/DB_PORT"
  type  = "String"
  value = tostring(aws_db_instance.os.port)
}

resource "aws_ssm_parameter" "db_name" {
  name  = "${local.ssm_prefix}/DB_NAME"
  type  = "String"
  value = var.db_name
}

resource "aws_ssm_parameter" "db_user" {
  name  = "${local.ssm_prefix}/DB_USER"
  type  = "String"
  value = var.db_username
}

resource "aws_ssm_parameter" "db_password" {
  name  = "${local.ssm_prefix}/DB_PASSWORD"
  type  = "SecureString"
  value = random_password.os_db.result
}
