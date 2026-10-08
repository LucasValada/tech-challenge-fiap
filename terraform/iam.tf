# Permissões do OS Service: consumir a própria fila e publicar
# comandos para o Execution e o Billing. Anexadas à role dos nós do EKS.
#
# Ordem de destroy: esta stack sai antes de tc3-infra-k8s. Com a política ainda
# anexada, a AWS não deixa apagar a role dos nós.

data "aws_iam_policy_document" "acesso" {
  statement {
    sid = "ConsumirAPropriaFila"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:ChangeMessageVisibility",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
    ]
    resources = [aws_sqs_queue.principal.arn]
  }

  statement {
    sid       = "PublicarNasFilasDestino"
    actions   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
    resources = local.filas_destino_arn
  }
}

resource "aws_iam_policy" "acesso" {
  name        = "oficina-os-acesso"
  description = "Acesso do OS Service a filas"
  policy      = data.aws_iam_policy_document.acesso.json
}

resource "aws_iam_role_policy_attachment" "nos_eks" {
  role       = local.node_role_name
  policy_arn = aws_iam_policy.acesso.arn
}
