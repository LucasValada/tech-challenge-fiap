import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  it('estende AuthGuard configurado com estratégia "jwt"', () => {
    const guard = new JwtAuthGuard();
    expect(guard).toBeInstanceOf(AuthGuard('jwt'));
  });
});
