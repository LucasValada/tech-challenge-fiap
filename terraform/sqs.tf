# Fila que este serviço consome (respostas da Saga). Configuração de
# docs/contratos.md: visibility timeout de 60 s (acima do timeout das chamadas
# externas feitas no consumo), long polling de 20 s e DLQ após 5 tentativas.

resource "aws_sqs_queue" "dlq" {
  name                      = "oficina-os-saga-replies-dlq"
  message_retention_seconds = 1209600 # 14 dias, tempo para corrigir e reprocessar
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "principal" {
  name                       = "oficina-os-saga-replies"
  visibility_timeout_seconds = 60
  receive_wait_time_seconds  = 20
  message_retention_seconds  = 345600 # 4 dias
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}
