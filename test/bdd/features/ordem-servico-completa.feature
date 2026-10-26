# language: pt
Funcionalidade: Ciclo completo de uma ordem de serviço entre os microsserviços
  Como oficina mecânica
  Quero que uma OS passe pelo diagnóstico, pelo orçamento, pelo pagamento e pelo reparo
  Para entregar o veículo ao cliente com cada etapa registrada pelo serviço responsável

  O OS Service orquestra a Saga. O Execution Service cuida da fila do mecânico e
  o Billing Service do orçamento e do pagamento no Mercado Pago (simulado).

  Contexto:
    Dado que o OS Service, o Billing Service e o Execution Service estão no ar
    E que o funcionário está autenticado
    E que existe um cliente com um veículo cadastrado
    E que existe o serviço "Troca de óleo" de R$ 120,00
    E que existe a peça "Filtro de óleo" de R$ 15,10 com 10 unidades em estoque

  Cenário: OS aberta, diagnosticada, aprovada, paga, reparada e entregue
    Quando o funcionário abre uma OS com 1 "Troca de óleo" e 2 "Filtro de óleo"
    Então a OS fica "RECEBIDA"
    E o estoque da peça cai para 8 unidades
    E o Execution coloca o diagnóstico na fila do mecânico

    Quando o mecânico inicia e conclui o diagnóstico
    Então o Billing gera o orçamento de R$ 150,20
    E a OS fica "AGUARDANDO_APROVACAO"

    Quando o cliente aprova o orçamento
    Então o cliente recebe o link de pagamento do Mercado Pago
    E a OS fica "AGUARDANDO_PAGAMENTO"

    Quando o Mercado Pago avisa que o pagamento foi aprovado
    Então o Billing registra o orçamento como "PAGO"
    E a OS fica "EM_EXECUCAO"
    E o Execution coloca o reparo na fila do mecânico

    Quando o mecânico inicia e conclui o reparo
    Então a OS fica "FINALIZADA"

    Quando o funcionário registra a entrega do veículo
    Então a OS fica "ENTREGUE"
    E o histórico da OS mostra as etapas na ordem:
      | RECEBIDA             |
      | EM_DIAGNOSTICO       |
      | AGUARDANDO_APROVACAO |
      | AGUARDANDO_PAGAMENTO |
      | EM_EXECUCAO          |
      | FINALIZADA           |
      | ENTREGUE             |
    E o estoque da peça continua em 8 unidades
