#!/bin/bash
# Cria no LocalStack as filas da Saga, para o OS rodar localmente sem AWS: a fila
# de respostas que ele consome (terraform/sqs.tf, com a DLQ) e as filas de
# comandos do Execution e do Billing, onde ele publica. Os comandos ficam nelas
# até alguém (os outros serviços ou um teste) consumir.
set -euo pipefail

awslocal sqs create-queue --queue-name oficina-os-saga-replies-dlq >/dev/null
DLQ_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/oficina-os-saga-replies-dlq \
  --attribute-names QueueArn --query Attributes.QueueArn --output text)

awslocal sqs create-queue --queue-name oficina-os-saga-replies \
  --attributes "{\"VisibilityTimeout\":\"60\",\"RedrivePolicy\":\"{\\\"deadLetterTargetArn\\\":\\\"${DLQ_ARN}\\\",\\\"maxReceiveCount\\\":\\\"5\\\"}\"}" >/dev/null

awslocal sqs create-queue --queue-name oficina-execution-commands >/dev/null
awslocal sqs create-queue --queue-name oficina-billing-commands >/dev/null

echo "filas da Saga criadas no LocalStack"
