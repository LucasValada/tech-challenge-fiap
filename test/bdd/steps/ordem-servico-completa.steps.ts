import { strict as assert } from 'node:assert';
import { randomInt } from 'node:crypto';
import {
  Given,
  Then,
  When,
  defineParameterType,
  type DataTable,
} from '@cucumber/cucumber';
import {
  ENDERECOS,
  MundoOficina,
  cpfAleatorio,
  identificadorUnico,
  placaAleatoria,
} from '../support/mundo';

// Valores em reais como aparecem na funcionalidade ("R$ 1.234,56").
defineParameterType({
  name: 'reais',
  regexp: /R\$ \d{1,3}(?:\.\d{3})*,\d{2}/,
  transformer: (texto: string) =>
    Number(texto.replace('R$ ', '').replace(/\./g, '').replace(',', '.')),
});

// Formato das respostas usadas pelos passos (Swagger de cada serviço).
interface Cadastro {
  id: string;
}
interface Ordem {
  id: string;
  status: string;
  historicoStatus: Array<{ status: string }>;
}
interface Peca {
  quantidadeEstoque: number;
}
interface Tarefa {
  id: string;
  status: string;
}
interface Orcamento {
  id: string;
  status: string;
  valorTotal: number;
}

const {
  os: OS,
  billing: BILLING,
  execution: EXECUTION,
  mercadoPago: MERCADO_PAGO,
} = ENDERECOS;

// ─── Consultas usadas nas esperas ────────────────────────────────────────────

async function statusDaOs(mundo: MundoOficina): Promise<string> {
  const ordem = await mundo.exigir<Ordem>(
    'GET',
    `${OS}/ordens-servico/${mundo.osId}`,
    { token: mundo.tokenFuncionario },
  );
  return ordem.status;
}

async function estoqueDaPeca(mundo: MundoOficina): Promise<number> {
  const peca = await mundo.exigir<Peca>(
    'GET',
    `${OS}/itens-estoque/${mundo.pecaId}`,
    { token: mundo.tokenFuncionario },
  );
  return peca.quantidadeEstoque;
}

async function tarefa(
  mundo: MundoOficina,
  tipo: 'DIAGNOSTICO' | 'REPARO',
): Promise<Tarefa | undefined> {
  const tarefas = await mundo.exigir<Tarefa[]>(
    'GET',
    `${EXECUTION}/tarefas?osId=${mundo.osId}&tipo=${tipo}`,
    {
      token: mundo.tokenFuncionario,
    },
  );
  return tarefas[0];
}

async function orcamento(mundo: MundoOficina): Promise<Orcamento | undefined> {
  const orcamentos = await mundo.exigir<Orcamento[]>(
    'GET',
    `${BILLING}/orcamentos?osId=${mundo.osId}`,
    {
      token: mundo.tokenFuncionario,
    },
  );
  return orcamentos[0];
}

async function iniciarEConcluir(
  mundo: MundoOficina,
  tipo: 'DIAGNOSTICO' | 'REPARO',
): Promise<void> {
  const atual = await tarefa(mundo, tipo);
  assert.ok(atual, `nenhuma tarefa de ${tipo} para a OS`);
  for (const acao of ['iniciar', 'concluir']) {
    await mundo.exigir('POST', `${EXECUTION}/tarefas/${atual.id}/${acao}`, {
      token: mundo.tokenFuncionario,
      corpo: {},
    });
  }
}

// ─── Contexto ────────────────────────────────────────────────────────────────

Given(
  'que o OS Service, o Billing Service e o Execution Service estão no ar',
  async function (this: MundoOficina) {
    // O BeforeAll (support/mundo.ts) já esperou a readiness dos três; aqui fica
    // a confirmação explícita para o relatório do cenário.
    for (const url of [
      `${OS}/health/ready`,
      `${BILLING}/health/ready`,
      `${EXECUTION}/health/ready`,
    ]) {
      assert.equal(
        (await this.requisitar('GET', url)).status,
        200,
        `${url} não está pronto`,
      );
    }
  },
);

Given(
  'que o funcionário está autenticado',
  async function (this: MundoOficina) {
    const login = await this.exigir<{ accessToken: string }>(
      'POST',
      `${OS}/auth/login`,
      {
        corpo: { email: 'admin@oficina.com', senha: 'senha123' },
      },
    );
    this.tokenFuncionario = login.accessToken;
  },
);

Given(
  'que existe um cliente com um veículo cadastrado',
  async function (this: MundoOficina) {
    this.cpf = cpfAleatorio();
    this.placa = placaAleatoria();
    const cliente = await this.exigir<Cadastro>('POST', `${OS}/cliente`, {
      token: this.tokenFuncionario,
      corpo: {
        nome: 'Cliente BDD',
        telefone: '(11)955554444',
        email: `bdd-${identificadorUnico()}@teste.com`,
        cpfCnpj: this.cpf,
        tipoPessoa: 'FISICA',
      },
    });
    this.clienteId = cliente.id;
    await this.exigir('POST', `${OS}/veiculos`, {
      token: this.tokenFuncionario,
      corpo: {
        placa: this.placa,
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2020,
        clienteId: this.clienteId,
      },
    });
    // Em produção o token do cliente vem da Lambda de autenticação por CPF.
    this.tokenCliente = this.assinarTokenCliente();
  },
);

Given(
  'que existe o serviço {string} de {reais}',
  async function (this: MundoOficina, nome: string, preco: number) {
    const servico = await this.exigir<Cadastro>('POST', `${OS}/servicos`, {
      token: this.tokenFuncionario,
      corpo: {
        nome: `${nome} ${identificadorUnico()}`,
        precoBase: preco,
        tempoEstimadoMin: 30,
      },
    });
    this.servicos.set(nome, servico.id);
  },
);

Given(
  'que existe a peça {string} de {reais} com {int} unidades em estoque',
  async function (
    this: MundoOficina,
    nome: string,
    preco: number,
    quantidade: number,
  ) {
    const peca = await this.exigir<Cadastro>('POST', `${OS}/itens-estoque`, {
      token: this.tokenFuncionario,
      corpo: {
        nome,
        tipo: 'PECA',
        sku: `BDD-${identificadorUnico()}`,
        precoUnitario: preco,
        quantidadeEstoque: quantidade,
        estoqueMinimo: 1,
      },
    });
    this.pecas.set(nome, peca.id);
    this.pecaId = peca.id;
  },
);

// ─── Atendimento (OS Service) ────────────────────────────────────────────────

When(
  'o funcionário abre uma OS com {int} {string} e {int} {string}',
  async function (
    this: MundoOficina,
    qtdServico: number,
    servico: string,
    qtdPeca: number,
    peca: string,
  ) {
    this.correlationId = `bdd-${identificadorUnico()}`;
    const ordem = await this.exigir<Cadastro>('POST', `${OS}/ordens-servico`, {
      token: this.tokenFuncionario,
      headers: { 'x-correlation-id': this.correlationId },
      corpo: {
        cpfCnpj: this.cpf,
        placa: this.placa,
        servicos: [
          { servicoId: this.servicos.get(servico), quantidade: qtdServico },
        ],
        itens: [{ itemEstoqueId: this.pecas.get(peca), quantidade: qtdPeca }],
      },
    });
    this.osId = ordem.id;
  },
);

Then('a OS fica {string}', async function (this: MundoOficina, status: string) {
  await this.esperar(`status da OS`, () => statusDaOs(this), status);
});

Then(
  'o estoque da peça cai para {int} unidades',
  async function (this: MundoOficina, quantidade: number) {
    assert.equal(await estoqueDaPeca(this), quantidade);
  },
);

Then(
  'o estoque da peça continua em {int} unidades',
  async function (this: MundoOficina, quantidade: number) {
    assert.equal(await estoqueDaPeca(this), quantidade);
  },
);

When(
  'o funcionário registra a entrega do veículo',
  async function (this: MundoOficina) {
    await this.exigir(
      'POST',
      `${OS}/ordens-servico/${this.osId}/transicao-status`,
      {
        token: this.tokenFuncionario,
        corpo: { status: 'ENTREGUE' },
      },
    );
  },
);

Then(
  'o histórico da OS mostra as etapas na ordem:',
  async function (this: MundoOficina, tabela: DataTable) {
    const ordem = await this.exigir<Ordem>(
      'GET',
      `${OS}/ordens-servico/${this.osId}`,
      { token: this.tokenFuncionario },
    );
    // Uma etapa pode ter mais de um registro (por exemplo, o diagnóstico
    // concluído antes de o orçamento chegar); a ordem das etapas é o que conta.
    const etapas = ordem.historicoStatus
      .map((registro) => registro.status)
      .filter((status, i, todos) => status !== todos[i - 1]);
    assert.deepEqual(
      etapas,
      tabela.raw().map(([status]) => status),
    );
  },
);

// ─── Mecânico (Execution Service) ────────────────────────────────────────────

Then(
  'o Execution coloca o diagnóstico na fila do mecânico',
  async function (this: MundoOficina) {
    await this.esperar(
      'tarefa de diagnóstico',
      async () => (await tarefa(this, 'DIAGNOSTICO'))?.status,
      'PENDENTE',
    );
  },
);

Then(
  'o Execution coloca o reparo na fila do mecânico',
  async function (this: MundoOficina) {
    await this.esperar(
      'tarefa de reparo',
      async () => (await tarefa(this, 'REPARO'))?.status,
      'PENDENTE',
    );
  },
);

When(
  'o mecânico inicia e conclui o diagnóstico',
  async function (this: MundoOficina) {
    await iniciarEConcluir(this, 'DIAGNOSTICO');
  },
);

When(
  'o mecânico inicia e conclui o reparo',
  async function (this: MundoOficina) {
    await iniciarEConcluir(this, 'REPARO');
  },
);

// ─── Orçamento e pagamento (Billing Service) ─────────────────────────────────

Then(
  'o Billing gera o orçamento de {reais}',
  async function (this: MundoOficina, valor: number) {
    await this.esperar(
      'valor do orçamento',
      async () => (await orcamento(this))?.valorTotal,
      valor,
    );
    const gerado = await orcamento(this);
    assert.ok(gerado);
    this.orcamentoId = gerado.id;
  },
);

When('o cliente aprova o orçamento', async function (this: MundoOficina) {
  const aprovado = await this.exigir<{ linkPagamento: string }>(
    'POST',
    `${BILLING}/orcamentos/${this.orcamentoId}/aprovar`,
    {
      token: this.tokenCliente,
    },
  );
  this.linkPagamento = aprovado.linkPagamento;
});

Then(
  'o cliente recebe o link de pagamento do Mercado Pago',
  function (this: MundoOficina) {
    // O link do Checkout Pro leva o id da preferência, criada com o id do
    // orçamento como referência externa.
    assert.match(
      this.linkPagamento,
      new RegExp(`^https?://.+${this.orcamentoId}`),
    );
  },
);

When(
  'o Mercado Pago avisa que o pagamento foi aprovado',
  async function (this: MundoOficina) {
    const atual = await orcamento(this);
    assert.ok(atual);
    const pagamentoId = randomInt(1_000_000, 9_999_999);
    // O simulador passa a responder a consulta do pagamento como o Mercado Pago
    // faria; o aviso só traz o id, e o Billing confirma consultando a API.
    await this.exigir('POST', `${MERCADO_PAGO}/__admin/mappings`, {
      corpo: {
        request: { method: 'GET', urlPath: `/v1/payments/${pagamentoId}` },
        response: {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          jsonBody: {
            id: pagamentoId,
            status: 'approved',
            status_detail: 'accredited',
            external_reference: this.orcamentoId,
            transaction_amount: atual.valorTotal,
            date_approved: new Date().toISOString(),
          },
        },
      },
    });
    const aviso = await this.exigir<{ resultado: string }>(
      'POST',
      `${BILLING}/webhooks/mercado-pago`,
      {
        corpo: {
          type: 'payment',
          action: 'payment.updated',
          data: { id: String(pagamentoId) },
        },
      },
    );
    assert.equal(aviso.resultado, 'PAGAMENTO_CONFIRMADO');
  },
);

Then(
  'o Billing registra o orçamento como {string}',
  async function (this: MundoOficina, status: string) {
    await this.esperar(
      'status do orçamento',
      async () => (await orcamento(this))?.status,
      status,
    );
  },
);
