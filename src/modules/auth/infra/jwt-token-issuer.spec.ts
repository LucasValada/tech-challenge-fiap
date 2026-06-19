import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';

const mockJwtService = {
  signAsync: jest.fn(),
};

describe('JwtTokenIssuer', () => {
  let issuer: JwtTokenIssuer;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        JwtTokenIssuer,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    issuer = moduleRef.get(JwtTokenIssuer);
    jest.clearAllMocks();
  });

  it('delega o sign para o JwtService com o payload recebido', async () => {
    mockJwtService.signAsync.mockResolvedValue('token-fake');

    const token = await issuer.sign({ sub: 'uuid-1', email: 'admin@email.com' });

    expect(token).toBe('token-fake');
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({
      sub: 'uuid-1',
      email: 'admin@email.com',
    });
  });
});
