import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt-token-issuer';

const FAKE_USER_ID = 'uuid-test';
const FAKE_EMAIL = 'usuario.teste@example.com';
const FAKE_TOKEN = 'fake-token-for-tests';

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
    mockJwtService.signAsync.mockResolvedValue(FAKE_TOKEN);

    const token = await issuer.sign({ sub: FAKE_USER_ID, email: FAKE_EMAIL });

    expect(token).toBe(FAKE_TOKEN);
    expect(mockJwtService.signAsync).toHaveBeenCalledWith({
      sub: FAKE_USER_ID,
      email: FAKE_EMAIL,
    });
  });
});
