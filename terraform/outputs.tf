output "fila_url" {
  description = "Fila consumida por este serviço."
  value       = aws_sqs_queue.principal.url
}

output "dlq_url" {
  value = aws_sqs_queue.dlq.url
}

output "ssm_internal_api_token_name" {
  description = "Parâmetro do token das rotas /internal, lido pelo CD do OS e pela Lambda de autenticação."
  value       = aws_ssm_parameter.internal_api_token.name
}
