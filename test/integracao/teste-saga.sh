#!/usr/bin/env bash
# Teste de integração da Saga com os três serviços juntos (docker-compose.yml
# desta pasta). Percorre uma OS de ponta a ponta só pelas APIs públicas, como
# fariam o funcionário, o mecânico, o cliente e o Mercado Pago, e confere o que
# cada serviço registrou.
#
# Uso, a partir desta pasta:
#   BILLING_DIR=<repo do Billing> EXECUTION_DIR=<repo do Execution> \
#     docker compose -p oficina-integracao up -d --build
#   bash teste-saga.sh
set -uo pipefail

OS=http://localhost:3000
BILLING=http://localhost:3001/billing
EXECUTION=http://localhost:3002/execution
MP=http://localhost:8089
JWT_SECRET=segredo-de-integracao

FALHAS=0
VERIFICACOES=0

ok()    { VERIFICACOES=$((VERIFICACOES + 1)); echo "  ok   $1"; }
falha() { VERIFICACOES=$((VERIFICACOES + 1)); FALHAS=$((FALHAS + 1)); echo "  FALHA $1"; }
confere() { if [ "$2" = "$3" ]; then ok "$1"; else falha "$1 (esperado '$3', veio '$2')"; fi; }

# Lê um valor do JSON da entrada padrão pelo caminho de chaves, por exemplo
# `campo 0 status`. Número indexa lista; o resto é chave de objeto.
campo() {
  python3 -c '
import json, sys
valor = json.load(sys.stdin)
for chave in sys.argv[1:]:
    valor = valor[int(chave)] if isinstance(valor, list) else valor[chave]
print(valor)' "$@" 2>/dev/null
}

# JWT HS256 assinado com o segredo comum aos três serviços (o mesmo que a
# Lambda de autenticação usa para o cliente).
jwt() {
  node -e '
    const c = require("node:crypto");
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const corpo = { ...JSON.parse(process.argv[2]), exp: Math.floor(Date.now() / 1000) + 3600 };
    const dados = b({ alg: "HS256", typ: "JWT" }) + "." + b(corpo);
    console.log(dados + "." + c.createHmac("sha256", process.argv[1]).update(dados).digest("base64url"));
  ' "$JWT_SECRET" "$1"
}

# Repete a consulta até o valor esperado aparecer (a Saga é assíncrona).
# Uso: espera "<descrição>" "<esperado>" comando...
espera() {
  local descricao="$1" esperado="$2" valor=""
  shift 2
  for _ in $(seq 1 30); do
    valor=$("$@")
    [ "$valor" = "$esperado" ] && { ok "$descricao"; return; }
    sleep 1
  done
  falha "$descricao (esperado '$esperado', veio '$valor')"
}

status_os() { curl -s "$OS/ordens-servico/$1" -H "$AUTH_FUNC" | campo status; }
estoque() { curl -s "$OS/itens-estoque/$ITEM" -H "$AUTH_FUNC" | campo quantidadeEstoque; }
tarefa() { curl -s "$EXECUTION/tarefas?osId=$1&tipo=$2" -H "$AUTH_FUNC" | campo 0 "$3"; }
orcamento() { curl -s "$BILLING/orcamentos?osId=$1" -H "$AUTH_FUNC" | campo 0 "$2"; }
status_pagamento() { curl -s "$BILLING/pagamentos?osId=$1" -H "$AUTH_FUNC" | campo 0 status; }
ultimo_historico() { curl -s "$OS/ordens-servico/$1" -H "$AUTH_FUNC" | campo historicoStatus -1 observacao; }

acao_mecanico() {
  local corpo="${3:-}"
  [ -z "$corpo" ] && corpo='{}'
  curl -s -o /dev/null -w '%{http_code}' -X POST "$EXECUTION/tarefas/$1/$2" \
    -H "$AUTH_FUNC" -H 'Content-Type: application/json' -d "$corpo"
}

# Cadastra no simulador o pagamento que o Mercado Pago devolveria e manda o
# aviso ao webhook do Billing, como o Mercado Pago faria.
pagamento_mp() {
  local id="$1" status="$2" detalhe="$3" orcamento_id="$4" valor="$5"
  curl -s -X POST "$MP/__admin/mappings" -d "{
    \"request\": {\"method\": \"GET\", \"urlPath\": \"/v1/payments/$id\"},
    \"response\": {\"status\": 200, \"headers\": {\"Content-Type\": \"application/json\"}, \"jsonBody\": {
      \"id\": $id, \"status\": \"$status\", \"status_detail\": \"$detalhe\",
      \"external_reference\": \"$orcamento_id\", \"transaction_amount\": $valor,
      \"date_approved\": \"2026-10-20T14:30:00.000-03:00\"}}}" >/dev/null
  curl -s -X POST "$BILLING/webhooks/mercado-pago" -H 'Content-Type: application/json' \
    -d "{\"type\": \"payment\", \"action\": \"payment.updated\", \"data\": {\"id\": \"$id\"}}" |
    campo resultado
}

# Leva uma OS recém-aberta até o reparo começar: diagnóstico pelo mecânico,
# orçamento aprovado pelo cliente e pago no Mercado Pago.
ate_o_reparo() {
  local os="$1" pagamento="$2" tarefa_id orcamento_id valor
  espera "  [$os] diagnóstico na fila do mecânico" PENDENTE tarefa "$os" DIAGNOSTICO status
  tarefa_id=$(tarefa "$os" DIAGNOSTICO id)
  acao_mecanico "$tarefa_id" iniciar >/dev/null
  acao_mecanico "$tarefa_id" concluir >/dev/null
  espera "  [$os] orçamento enviado" AGUARDANDO_APROVACAO status_os "$os"
  orcamento_id=$(orcamento "$os" id)
  valor=$(orcamento "$os" valorTotal)
  curl -s -X POST "$BILLING/orcamentos/$orcamento_id/aprovar" -H "$AUTH_CLIENTE" >/dev/null
  espera "  [$os] aguardando pagamento" AGUARDANDO_PAGAMENTO status_os "$os"
  pagamento_mp "$pagamento" approved accredited "$orcamento_id" "$valor" >/dev/null
  espera "  [$os] em execução" EM_EXECUCAO status_os "$os"
}

echo "== Preparação"
for servico in "$OS/health/ready" "$BILLING/health/ready" "$EXECUTION/health/ready"; do
  espera "pronto: $servico" 200 curl -s -o /dev/null -w '%{http_code}' "$servico"
done

TOKEN_FUNC=$(curl -s -X POST "$OS/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","senha":"senha123"}' | campo accessToken)
AUTH_FUNC="Authorization: Bearer $TOKEN_FUNC"
CPF="902.413.576-16"
CLIENTE=$(curl -s -X POST "$OS/cliente" -H "$AUTH_FUNC" -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Cliente Integração\",\"telefone\":\"(11)955554444\",\"email\":\"integracao@teste.com\",\"cpfCnpj\":\"$CPF\",\"tipoPessoa\":\"FISICA\"}" | campo id)
for placa in INT1A01 INT1A02 INT1A03; do
  curl -s -X POST "$OS/veiculos" -H "$AUTH_FUNC" -H 'Content-Type: application/json' \
    -d "{\"placa\":\"$placa\",\"marca\":\"Fiat\",\"modelo\":\"Uno\",\"ano\":2020,\"clienteId\":\"$CLIENTE\"}" >/dev/null
done
SERVICO=$(curl -s -X POST "$OS/servicos" -H "$AUTH_FUNC" -H 'Content-Type: application/json' \
  -d '{"nome":"Troca de óleo","precoBase":120,"tempoEstimadoMin":30}' | campo id)
ITEM=$(curl -s -X POST "$OS/itens-estoque" -H "$AUTH_FUNC" -H 'Content-Type: application/json' \
  -d "{\"nome\":\"Filtro de óleo\",\"tipo\":\"PECA\",\"sku\":\"INT-$(date +%s)\",\"precoUnitario\":15.1,\"quantidadeEstoque\":10,\"estoqueMinimo\":1}" | campo id)
TOKEN_CLIENTE=$(jwt "{\"sub\":\"$CLIENTE\",\"tipo\":\"cliente\",\"cpf\":\"$CPF\",\"nome\":\"Cliente Integração\"}")
AUTH_CLIENTE="Authorization: Bearer $TOKEN_CLIENTE"

abrir_os() {
  curl -s -X POST "$OS/ordens-servico" -H "$AUTH_FUNC" -H "x-correlation-id: $2" \
    -H 'Content-Type: application/json' \
    -d "{\"cpfCnpj\":\"$CPF\",\"placa\":\"$1\",\"servicos\":[{\"servicoId\":\"$SERVICO\",\"quantidade\":1}],\"itens\":[{\"itemEstoqueId\":\"$ITEM\",\"quantidade\":2}]}" |
    campo id
}

echo "== 1. Caminho feliz: abertura → diagnóstico → orçamento → pagamento → reparo → entrega"
OS1=$(abrir_os INT1A01 fluxo-integracao-1)
confere "OS aberta em RECEBIDA" "$(status_os "$OS1")" RECEBIDA
confere "estoque baixado na abertura" "$(estoque)" 8

espera "Execution: diagnóstico na fila do mecânico" PENDENTE tarefa "$OS1" DIAGNOSTICO status
T1=$(tarefa "$OS1" DIAGNOSTICO id)
confere "mecânico inicia o diagnóstico" "$(acao_mecanico "$T1" iniciar)" 200
espera "OS em diagnóstico" EM_DIAGNOSTICO status_os "$OS1"
confere "mecânico conclui o diagnóstico" "$(acao_mecanico "$T1" concluir)" 200

espera "Billing: orçamento gerado com o total da OS" 150.2 orcamento "$OS1" valorTotal
espera "OS aguardando aprovação" AGUARDANDO_APROVACAO status_os "$OS1"
confere "linhas da OS travadas depois do diagnóstico" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$OS/ordens-servico/$OS1/servicos" -H "$AUTH_FUNC" \
    -H 'Content-Type: application/json' -d "{\"servicoId\":\"$SERVICO\",\"quantidade\":1}")" 409

ORC1=$(orcamento "$OS1" id)
LINK=$(curl -s -X POST "$BILLING/orcamentos/$ORC1/aprovar" -H "$AUTH_CLIENTE" | campo linkPagamento)
confere "cliente aprova e recebe o link de pagamento" "$LINK" "http://localhost:8089/sandbox/checkout/pref-$ORC1"
espera "OS aguardando pagamento" AGUARDANDO_PAGAMENTO status_os "$OS1"

confere "Mercado Pago: pagamento recusado" "$(pagamento_mp 7101 rejected cc_rejected_other_reason "$ORC1" 150.2)" PAGAMENTO_RECUSADO
espera "recusa registrada no histórico da OS" \
  "Billing: pagamento recusado (cc_rejected_other_reason); o cliente pode tentar de novo pelo mesmo link" \
  ultimo_historico "$OS1"
confere "OS continua aguardando pagamento" "$(status_os "$OS1")" AGUARDANDO_PAGAMENTO

confere "Mercado Pago: segunda tentativa aprovada" "$(pagamento_mp 7102 approved accredited "$ORC1" 150.2)" PAGAMENTO_CONFIRMADO
espera "OS em execução" EM_EXECUCAO status_os "$OS1"
espera "Execution: reparo na fila do mecânico" PENDENTE tarefa "$OS1" REPARO status
T2=$(tarefa "$OS1" REPARO id)
acao_mecanico "$T2" iniciar >/dev/null
confere "mecânico conclui o reparo" "$(acao_mecanico "$T2" concluir)" 200
espera "OS finalizada" FINALIZADA status_os "$OS1"

confere "funcionário registra a entrega" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$OS/ordens-servico/$OS1/transicao-status" -H "$AUTH_FUNC" \
    -H 'Content-Type: application/json' -d '{"status":"ENTREGUE"}')" 200
confere "OS entregue" "$(status_os "$OS1")" ENTREGUE
confere "Billing: orçamento pago" "$(orcamento "$OS1" status)" PAGO
confere "estoque continua baixado (o reparo usou as peças)" "$(estoque)" 8

echo "== 2. Compensação: o reparo falha depois do pagamento"
OS2=$(abrir_os INT1A02 fluxo-integracao-2)
ate_o_reparo "$OS2" 7201
T3=$(tarefa "$OS2" REPARO id)
confere "mecânico registra a falha" \
  "$(acao_mecanico "$T3" falhar '{"motivo":"Peça indisponível no fornecedor"}')" 200
espera "OS cancelada" CANCELADA status_os "$OS2"
espera "estoque devolvido" 8 estoque
espera "Billing: pagamento estornado" ESTORNADO status_pagamento "$OS2"
espera "estorno registrado no histórico da OS" "Billing: pagamento 7201 estornado ao cliente" \
  ultimo_historico "$OS2"

echo "== 3. Compensação: o funcionário cancela a OS esperando o pagamento"
OS3=$(abrir_os INT1A03 fluxo-integracao-3)
espera "  [$OS3] diagnóstico na fila do mecânico" PENDENTE tarefa "$OS3" DIAGNOSTICO status
T4=$(tarefa "$OS3" DIAGNOSTICO id)
acao_mecanico "$T4" iniciar >/dev/null
acao_mecanico "$T4" concluir >/dev/null
espera "  [$OS3] orçamento enviado" AGUARDANDO_APROVACAO status_os "$OS3"
ORC3=$(orcamento "$OS3" id)
curl -s -X POST "$BILLING/orcamentos/$ORC3/aprovar" -H "$AUTH_CLIENTE" >/dev/null
espera "  [$OS3] aguardando pagamento" AGUARDANDO_PAGAMENTO status_os "$OS3"
confere "funcionário cancela" \
  "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$OS/ordens-servico/$OS3/cancelar" -H "$AUTH_FUNC" \
    -H 'Content-Type: application/json' -d '{"motivo":"Cliente desistiu do pagamento"}')" 200
espera "estoque devolvido" 8 estoque
espera "Billing: orçamento cancelado" CANCELADO orcamento "$OS3" status
confere "Billing: link de pagamento expirado no Mercado Pago" \
  "$(curl -s "$MP/__admin/requests" | python3 -c "import json,sys;print(any(r['request']['method']=='PUT' and r['request']['url']=='/checkout/preferences/pref-$ORC3' for r in json.load(sys.stdin)['requests']))")" \
  True

echo "== 4. Rastreamento: o correlationId da abertura aparece nos logs dos três serviços"
for servico in os billing execution; do
  # Os logs vão para uma variável antes da busca: com pipefail, o `grep -q`
  # encerraria a leitura no meio e a pipeline contaria como falha.
  logs=$(docker compose -p oficina-integracao logs "$servico" --no-log-prefix 2>/dev/null)
  if grep -q '"correlationId":"fluxo-integracao-1"' <<<"$logs"; then
    ok "logs do $servico com o fluxo da OS 1"
  else
    falha "logs do $servico sem o fluxo da OS 1"
  fi
done

echo
echo "== Resultado: $((VERIFICACOES - FALHAS))/$VERIFICACOES verificações ok"
[ "$FALHAS" -eq 0 ]
