import { ConflictException } from '@nestjs/common';
import { garantirSkuUnico } from './garantirSkuUnico';

const SKU_NOVO = 'FLT-NOVO-001';
const SKU_EXISTENTE = 'FLT-OLEO-001';
const ITEM_ID = 'item-uuid-1';

const mockRepo = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySku: jest.fn(),
  findBaixoEstoque: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('garantirSkuUnico', () => {
  beforeEach(() => jest.clearAllMocks());

  it('nao lanca quando sku nao existe', async () => {
    mockRepo.findBySku.mockResolvedValue(null);

    await expect(garantirSkuUnico(mockRepo, SKU_NOVO)).resolves.toBeUndefined();
    expect(mockRepo.findBySku).toHaveBeenCalledWith(SKU_NOVO, undefined);
  });

  it('lanca ConflictException quando sku ja existe', async () => {
    mockRepo.findBySku.mockResolvedValue({ id: 'outro' });

    await expect(
      garantirSkuUnico(mockRepo, SKU_EXISTENTE),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('propaga excludeId para o repositório', async () => {
    mockRepo.findBySku.mockResolvedValue(null);

    await garantirSkuUnico(mockRepo, SKU_EXISTENTE, ITEM_ID);

    expect(mockRepo.findBySku).toHaveBeenCalledWith(SKU_EXISTENTE, ITEM_ID);
  });
});
