import type { BuscarClientePorCpfUseCase } from '../../application/use-case/buscar-cliente-por-cpf.use-case';
import { ClienteInternoController } from './cliente-interno.controller';

describe('ClienteInternoController', () => {
  it('repassa o CPF do corpo para a busca', async () => {
    const buscar = {
      execute: jest
        .fn()
        .mockResolvedValue({ id: 'c1', nome: 'Maria', status: 'ATIVO' }),
    };
    const controller = new ClienteInternoController(
      buscar as unknown as BuscarClientePorCpfUseCase,
    );

    await expect(controller.buscar({ cpf: '529.982.247-25' })).resolves.toEqual(
      { id: 'c1', nome: 'Maria', status: 'ATIVO' },
    );
    expect(buscar.execute).toHaveBeenCalledWith('529.982.247-25');
  });
});
