# Monitoria do Postgres sem CloudWatch.
#
# O caminho tradicional seria a integração AWS do New Relic lendo o namespace
# `AWS/RDS` — o que significa CloudWatch no meio, cobrado por chamada de API ou
# por GB de Firehose. Aqui o agente conversa com o banco direto:
#
#   Deployment no cluster ──psql──▶ RDS ──▶ pg_stat_* ──HTTPS──▶ New Relic
#
# São as mesmas visões do catálogo que a AWS lê para montar as métricas do
# CloudWatch, sem o intermediário. Em troca de sair do CloudWatch, ganhamos
# métrica que ele nunca expôs — cache hit ratio, locks, bloat por tabela — e
# perdemos as que só o hipervisor enxerga, como `BurstBalance` do EBS.

# ─── Usuário de leitura ─────────────────────────────────────────────────────
# `pg_monitor` é a role que o próprio Postgres criou para este caso: dá acesso
# às visões de estatística inteiras e a nenhuma tabela de negócio.

resource "random_password" "db_monitor" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "db_monitor_password" {
  name        = "${local.ssm_prefix}/DB_MONITOR_PASSWORD"
  description = "Senha do usuário de leitura usado pelo nri-postgresql"
  type        = "SecureString"
  value       = random_password.db_monitor.result
}

locals {
  # Porta do servidor de status do agente de infraestrutura (default dele).
  # Escuta apenas em localhost — por isso as sondas do Deployment são `exec`.
  nria_status_port = 8003

  # URL no formato do libpq, que é diferente do que o Prisma consome: `schema`
  # não é parâmetro de conexão e faz o psql abortar com "invalid URI query
  # parameter". `sslmode=require` porque o RDS recusa conexão em texto claro.
  admin_url_psql = format(
    "postgresql://%s:%s@%s:%s/%s?sslmode=require",
    var.db_username,
    random_password.os_db.result,
    aws_db_instance.os.address,
    aws_db_instance.os.port,
    var.db_name,
  )

  # Config da integração on-host. Vai em Secret, e não em ConfigMap, porque a
  # senha do usuário de monitoria mora dentro dela.
  postgres_integration_config = yamlencode({
    integrations = [
      {
        name = "nri-postgresql"

        env = {
          HOSTNAME = aws_db_instance.os.address
          PORT     = tostring(aws_db_instance.os.port)
          USERNAME = var.db_monitor_user
          PASSWORD = random_password.db_monitor.result
          DATABASE = var.db_name

          # Só métrica de banco. Trocar por "ALL" acrescenta tabela e índice um
          # a um — informação útil e volume que não cabe no free tier.
          COLLECTION_LIST = jsonencode({ (var.db_name) = {} })

          # O RDS exige TLS; a CA dele não está no bundle do contêiner e o
          # tráfego não sai da VPC, então criptografa sem validar cadeia.
          ENABLE_SSL               = "true"
          TRUST_SERVER_CERTIFICATE = "true"

          TIMEOUT = "10"
        }

        interval         = var.newrelic_postgres_interval
        inventory_source = "config/postgresql"
      }
    ]
  })
}

# ─── Bootstrap do usuário ───────────────────────────────────────────────────
# Criar role exige executar SQL, e o RDS não é acessível de fora da VPC — nem do
# runner do GitHub Actions. O Job resolve isso de dentro do cluster, que já tem
# rota e já está autorizado no security group do banco.
#
# É idempotente: roda de novo a cada mudança de senha e não faz nada quando não
# há o que mudar.

resource "kubernetes_config_map" "postgres_bootstrap" {
  metadata {
    name      = "nr-postgres-bootstrap-sql"
    namespace = var.newrelic_namespace
  }

  data = {
    "bootstrap.sql" = <<-SQL
      -- Usuário de monitoria do New Relic.
      -- `\gexec` executa o comando que a consulta devolve: é o jeito de o psql
      -- fazer "CREATE ROLE IF NOT EXISTS", que o Postgres não tem.

      SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'usuario', :'senha')
      WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'usuario')
      \gexec

      -- Mantém a senha em dia quando o Terraform a rotaciona.
      SELECT format('ALTER ROLE %I WITH LOGIN PASSWORD %L', :'usuario', :'senha')
      \gexec

      SELECT format('GRANT pg_monitor TO %I', :'usuario')
      \gexec

      SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'usuario')
      \gexec
    SQL
  }
}

# Credencial de administrador dentro do cluster é o preço deste desenho, e vale
# dizer em voz alta: qualquer pod com RBAC de leitura de Secret neste namespace
# consegue lê-la. O namespace `newrelic` só tem os agentes, e o Secret some com
# o `terraform destroy` — mas em ambiente com mais gente a alternativa é um
# bastion host rodando o SQL uma vez, à mão.
resource "kubernetes_secret" "postgres_bootstrap" {
  metadata {
    name      = "nr-postgres-bootstrap"
    namespace = var.newrelic_namespace
  }

  data = {
    ADMIN_URL        = local.admin_url_psql
    MONITOR_USER     = var.db_monitor_user
    MONITOR_PASSWORD = random_password.db_monitor.result
  }

  type = "Opaque"
}

# O nome carrega um resumo da credencial de propósito. `spec.template` de um Job
# é imutável no Kubernetes: rotacionar a senha sem trocar o nome deixaria o Job
# antigo intacto, o `ALTER ROLE` nunca rodaria e o agente passaria a autenticar
# com uma senha que o banco não conhece — falha silenciosa, já que o Terraform
# reportaria sucesso. Com o resumo no nome, senha nova é Job novo.
resource "kubernetes_job" "postgres_bootstrap" {
  metadata {
    name      = "nr-postgres-bootstrap-${substr(sha256(random_password.db_monitor.result), 0, 8)}"
    namespace = var.newrelic_namespace
  }

  spec {
    # Duas tentativas cobrem o caso comum de o RDS ainda estar respondendo
    # "starting up" quando o Job sobe. Mais que isso é problema de rede ou de
    # credencial, e repetir não resolve.
    backoff_limit = 2

    template {
      metadata {
        labels = {
          app = "nr-postgres-bootstrap"
        }
      }

      spec {
        restart_policy = "OnFailure"

        container {
          name  = "psql"
          image = "postgres:17-alpine"

          command = [
            "sh", "-c",
            "psql \"$ADMIN_URL\" -v ON_ERROR_STOP=1 -v usuario=\"$MONITOR_USER\" -v senha=\"$MONITOR_PASSWORD\" -f /sql/bootstrap.sql",
          ]

          env {
            name = "ADMIN_URL"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres_bootstrap.metadata[0].name
                key  = "ADMIN_URL"
              }
            }
          }

          env {
            name = "MONITOR_USER"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres_bootstrap.metadata[0].name
                key  = "MONITOR_USER"
              }
            }
          }

          env {
            name = "MONITOR_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres_bootstrap.metadata[0].name
                key  = "MONITOR_PASSWORD"
              }
            }
          }

          volume_mount {
            name       = "sql"
            mount_path = "/sql"
            read_only  = true
          }
        }

        volume {
          name = "sql"

          config_map {
            name = kubernetes_config_map.postgres_bootstrap.metadata[0].name
          }
        }
      }
    }
  }

  # O agente sobe depois: sem o usuário criado, ele só acumularia erro de
  # autenticação no log e a primeira métrica só apareceria no apply seguinte.
  wait_for_completion = true

  timeouts {
    create = "10m"
    update = "10m"
  }

  depends_on = [aws_db_instance.os]
}

# ─── Agente ─────────────────────────────────────────────────────────────────

resource "kubernetes_secret" "nri_postgresql" {
  metadata {
    name      = "nri-postgresql"
    namespace = var.newrelic_namespace
  }

  data = {
    "NRIA_LICENSE_KEY"      = data.aws_ssm_parameter.newrelic_license_key.value
    "postgresql-config.yml" = local.postgres_integration_config
  }

  type = "Opaque"
}

resource "kubernetes_deployment" "nri_postgresql" {
  metadata {
    name      = "nri-postgresql"
    namespace = var.newrelic_namespace

    labels = {
      "app.kubernetes.io/name"       = "nri-postgresql"
      "app.kubernetes.io/managed-by" = "terraform"
    }
  }

  spec {
    replicas = 1

    # Duas réplicas do mesmo agente reportariam a mesma métrica duas vezes, e o
    # gráfico passaria a mostrar o dobro das conexões que existem. Recreate
    # garante que a nova só sobe depois que a antiga morre.
    strategy {
      type = "Recreate"
    }

    selector {
      match_labels = {
        "app.kubernetes.io/name" = "nri-postgresql"
      }
    }

    template {
      metadata {
        labels = {
          "app.kubernetes.io/name" = "nri-postgresql"
        }

        annotations = {
          # Secret montado em volume atualiza sozinho no disco, mas o agente só
          # lê a configuração ao iniciar. O hash força o rollout quando o
          # endpoint ou a senha mudam.
          #
          # Cobre os DOIS campos do Secret, não só a config: NRIA_LICENSE_KEY
          # entra no contêiner como env (`value_from`, mais abaixo), lida uma
          # única vez no start. Hasheando só a config, rotacionar a chave em
          # tc3-infra-k8s atualizava o Secret sem mexer nesta anotação: o pod
          # seguia com a chave antiga e, quando ela fosse revogada, o agente
          # tomaria 403 do coletor em silêncio até um rollout por outro motivo.
          #
          # Ao acrescentar campo ao Secret, acrescente aqui também. É o preço de
          # hashear as origens em vez de `kubernetes_secret.….data`, e o que
          # garante valor conhecido no plan, sem depender de o provider marcar
          # `data` como sensível (`nonsensitive` sobre valor não-sensível é erro
          # de plan, não aviso).
          "checksum/secret" = sha256(jsonencode({
            config      = local.postgres_integration_config
            license_key = data.aws_ssm_parameter.newrelic_license_key.value
          }))

          # Não coletar o stdout deste pod: o agente loga o que já está enviando
          # como métrica, e o Fluent Bit cobraria por isso duas vezes.
          "fluentbit.io/exclude" = "true"
        }
      }

      spec {
        container {
          name  = "agent"
          image = "newrelic/infrastructure-bundle:${var.newrelic_infra_bundle_tag}"

          env {
            name = "NRIA_LICENSE_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.nri_postgresql.metadata[0].name
                key  = "NRIA_LICENSE_KEY"
              }
            }
          }

          # Nome do host no New Relic. Sem isto o entity aparece como o hash do
          # pod e muda a cada rollout, quebrando qualquer filtro salvo.
          env {
            name  = "NRIA_DISPLAY_NAME"
            value = aws_db_instance.os.identifier
          }

          # Viram atributo em toda amostra deste agente, inclusive
          # PostgresqlDatabaseSample e PostgresqlInstanceSample — é pelas tags
          # padrão (environment/project) que os dashboards e os alertas de
          # banco em tc3-infra-k8s filtram.
          env {
            name  = "NRIA_CUSTOM_ATTRIBUTES"
            value = jsonencode(merge(var.newrelic_tags, { componente = "postgres" }))
          }

          # Servidor de status local do agente (porta 8003, só localhost). É o
          # que as sondas abaixo consultam, de dentro do contêiner.
          env {
            name  = "NRIA_STATUS_SERVER_ENABLED"
            value = "true"
          }

          env {
            name  = "NRIA_STATUS_SERVER_PORT"
            value = tostring(local.nria_status_port)
          }

          # Este pod existe para monitorar o RDS, não a si mesmo. Desligar as
          # amostras de host corta a maior parte do volume que ele geraria.
          env {
            name  = "NRIA_METRICS_SYSTEM_SAMPLE_RATE"
            value = "-1"
          }

          env {
            name  = "NRIA_METRICS_STORAGE_SAMPLE_RATE"
            value = "-1"
          }

          env {
            name  = "NRIA_METRICS_NETWORK_SAMPLE_RATE"
            value = "-1"
          }

          env {
            name  = "NRIA_METRICS_PROCESS_SAMPLE_RATE"
            value = "-1"
          }

          # Sem isto o agente consulta o IMDS a cada início procurando metadado
          # de EC2 que não vai usar.
          env {
            name  = "NRIA_DISABLE_CLOUD_METADATA"
            value = "true"
          }

          volume_mount {
            name       = "integracao"
            mount_path = "/etc/newrelic-infra/integrations.d"
            read_only  = true
          }

          # ─── Saúde do agente ────────────────────────────────────────────
          # Este pod fica fora do caminho de qualquer requisição: se o agente
          # travar, nada quebra e ninguém percebe — só o painel de banco fica
          # vazio. As sondas fazem o Kubernetes perceber antes do time.
          #
          # Todas em `exec`, e não httpGet/tcpSocket: o servidor de status do
          # agente escuta SÓ em localhost (`Status.Enable("localhost", port)`
          # no código do agente), e o kubelet sonda pelo IP do pod — uma sonda
          # HTTP daria "connection refused" para sempre e a liveness deixaria o
          # pod em CrashLoop. O wget é o do BusyBox da imagem (Alpine).
          #
          # E `127.0.0.1`, não `localhost`: o servidor escuta só em IPv4, e o
          # wget do BusyBox resolve `localhost` para `::1` (o /etc/hosts da
          # imagem lista os dois) sem tentar o outro endereço. Com `localhost`
          # a startup nunca passava e o pod reiniciava a cada 3 min.
          #
          #   startup    o servidor de status só sobe DEPOIS de o agente
          #              conseguir falar com o New Relic (checagem de rede da
          #              inicialização). Dá até 3 min para isso sem a liveness
          #              interferir.
          #   liveness   /v1/status/ready: o processo está de pé e respondendo.
          #              Não usa o /health de propósito — reiniciar não conserta
          #              chave errada nem New Relic fora do ar.
          #   readiness  /v1/status/health: devolve 500 quando a credencial não
          #              é aceita ou o backend não responde. O pod fica NotReady
          #              — visível no `kubectl get pods` e no K8sPodSample — em
          #              vez de Running e mudo.
          startup_probe {
            exec {
              command = ["wget", "-q", "-T", "3", "-O", "/dev/null", "http://127.0.0.1:${local.nria_status_port}/v1/status/ready"]
            }

            period_seconds    = 10
            timeout_seconds   = 5
            failure_threshold = 18
          }

          liveness_probe {
            exec {
              command = ["wget", "-q", "-T", "3", "-O", "/dev/null", "http://127.0.0.1:${local.nria_status_port}/v1/status/ready"]
            }

            period_seconds    = 30
            timeout_seconds   = 5
            failure_threshold = 3
          }

          readiness_probe {
            exec {
              command = ["wget", "-q", "-T", "8", "-O", "/dev/null", "http://127.0.0.1:${local.nria_status_port}/v1/status/health"]
            }

            period_seconds    = 60
            timeout_seconds   = 10
            failure_threshold = 3
          }

          resources {
            requests = {
              cpu    = "50m"
              memory = "128Mi"
            }

            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
          }
        }

        volume {
          name = "integracao"

          secret {
            secret_name = kubernetes_secret.nri_postgresql.metadata[0].name

            items {
              key  = "postgresql-config.yml"
              path = "postgresql-config.yml"
            }
          }
        }
      }
    }
  }

  depends_on = [kubernetes_job.postgres_bootstrap]
}
