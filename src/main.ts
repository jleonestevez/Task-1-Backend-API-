import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configurar CORS
  app.enableCors();
  
  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Configurar Swagger/OpenAPI
  const config = new DocumentBuilder()
    .setTitle('Web Scraper API')
    .setDescription('API para realizar web scraping y crawling de sitios web')
    .setVersion('1.0')
    .addTag('scraper')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Aplicación ejecutándose en: http://localhost:${port}`);
  console.log(`Documentación disponible en: http://localhost:${port}/api`);
}
bootstrap(); 