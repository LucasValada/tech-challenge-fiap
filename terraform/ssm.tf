# Token das rotas /internal do OS (POST /internal/clientes/busca), chamadas pela
# Lambda de autenticação por CPF (tc3-auth-lambda), que deixa de ler o banco do
# OS (docs/contratos.md, seção 7). Gerado aqui e guardado só no SSM: o CD do OS
# monta o Secret do Kubernetes a partir dele, e a Lambda lê o mesmo parâmetro.

resource "random_password" "internal_api_token" {
  length  = 48
  special = false # vai em header HTTP; só letras e números
}

resource "aws_ssm_parameter" "internal_api_token" {
  name        = "${local.ssm_prefix}/INTERNAL_API_TOKEN"
  description = "Token das rotas /internal do OS Service (Lambda de autenticação)"
  type        = "SecureString"
  value       = random_password.internal_api_token.result
}
