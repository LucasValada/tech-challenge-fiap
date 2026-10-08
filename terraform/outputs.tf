output "fila_url" {
  description = "Fila consumida por este serviço."
  value       = aws_sqs_queue.principal.url
}

output "dlq_url" {
  value = aws_sqs_queue.dlq.url
}
