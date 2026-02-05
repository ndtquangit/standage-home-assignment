import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('app.port');
  const corsOrigin = configService.get('app.corsOrigin');

  // Enable CORS
  app.enableCors({
    origin: corsOrigin?.split(',').map((origin: string) => origin.trim()) || '*',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix for API routes
  app.setGlobalPrefix('api');

  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}
bootstrap();
