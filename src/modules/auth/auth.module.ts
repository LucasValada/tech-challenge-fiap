import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './interface/controller/auth.controller';
import { AuthService } from './application/use-case/auth.service';
import { JwtStrategy } from './interface/strategies/jwt.strategy';
import { AUTH_USER_REPOSITORY } from './domain/repository/auth-user.repository';
import { PrismaAuthUserRepository } from '../../infra/database/prisma/repositories/prisma.auth-user.repository';

@Module({
  imports: [
    PrismaModule,
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
    {
      provide: AUTH_USER_REPOSITORY,
      useClass: PrismaAuthUserRepository,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
