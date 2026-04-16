import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserService } from '../user/user.service';
import { PrismaUserRepository } from '../../infra/database/prisma/repositories/prisma.user.repository';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET não está definida.');
        }
        const signOptions = {
          expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '1h',
        } as JwtSignOptions;
        return { secret, signOptions };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    UserService,
    { provide: 'USER_REPOSITORY', useClass: PrismaUserRepository },
  ],
  exports: [AuthService],
})
export class AuthModule {}
