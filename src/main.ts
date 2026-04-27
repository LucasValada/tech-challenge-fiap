import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { validateEnv } from './core/config/env';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tech Challenge Fiap - SOAT Oficina')
    .setDescription(
      'API de gerenciamento de oficina mecânica. Gerencie clientes, veículos, serviços, peças/insumos e ordens de serviço.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
