import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Global prefix ──────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

  // ── CORS ───────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // ── Global pipes ───────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ── Global filters & interceptors ──────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  // ── Swagger / OpenAPI ──────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Document Intelligence Platform API')
    .setDescription(
      'Backend API for the Intelligent Universal Document Transformation & Editing Platform. ' +
        'Provides document ingestion, metadata management, editing, export, and search capabilities.',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Keycloak JWT token',
        in: 'header',
      },
      'keycloak-jwt',
    )
    .addTag('Health', 'Liveness and readiness probes')
    .addTag('Auth', 'Authentication and user profile')
    .addTag('Documents', 'Document ingestion and management')
    .addTag('Metadata', 'Document metadata operations')
    .addTag('Editing', 'Document editing operations')
    .addTag('Export', 'Document export and reconstruction')
    .addTag('Search', 'Full-text and metadata search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // ── Start ──────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger UI available at http://localhost:${port}/api`);
}

bootstrap();
