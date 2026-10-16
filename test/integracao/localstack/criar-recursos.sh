#!/bin/bash
# Recursos AWS dos três serviços no LocalStack, iguais aos terraform/ de cada
# repositório: as três filas da Saga (com DLQ) e a tabela de tarefas do
# Execution.
set -euo pipefail

criar_fila_com_dlq() {
  local fila="$1"
  awslocal sqs create-queue --queue-name "${fila}-dlq" >/dev/null
  local dlq_arn
  dlq_arn=$(awslocal sqs get-queue-attributes \
    --queue-url "http://localhost:4566/000000000000/${fila}-dlq" \
    --attribute-names QueueArn --query Attributes.QueueArn --output text)
  awslocal sqs create-queue --queue-name "$fila" \
    --attributes "{\"VisibilityTimeout\":\"60\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${dlq_arn}\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}" >/dev/null
}

criar_fila_com_dlq oficina-os-saga-replies
criar_fila_com_dlq oficina-execution-commands
criar_fila_com_dlq oficina-billing-commands

awslocal dynamodb create-table --table-name oficina-execution-tarefas \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions AttributeName=id,AttributeType=S AttributeName=status,AttributeType=S \
    AttributeName=criadoEm,AttributeType=S AttributeName=osId,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --global-secondary-indexes '[
    {"IndexName":"por-status","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"criadoEm","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}},
    {"IndexName":"por-os","KeySchema":[{"AttributeName":"osId","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}
  ]' >/dev/null

echo "recursos da Saga criados no LocalStack"
