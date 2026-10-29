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

output "db_endpoint" {
  description = "Endereço do banco do OS (só acessível de dentro da VPC)."
  value       = aws_db_instance.os.address
}

output "ssm_database_url_name" {
  description = "Parâmetro com a connection string, lido pelo CD do OS."
  value       = aws_ssm_parameter.database_url.name
}
