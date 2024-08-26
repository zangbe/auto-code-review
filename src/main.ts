import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('CodeReview example')
    .setDescription('The Auto Coude Review API description')
    .setVersion('1.0')
    .addTag('API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const server = app.getHttpServer();
  // The timeout value for sockets
  server.setTimeout(10 * 60 * 1000);
  // The number of milliseconds of inactivity a server needs to wait for additional incoming data
  server.keepAliveTimeout = 300000;
  // Limit the amount of time the parser will wait to receive the complete HTTP headers
  server.headersTimeout = 310000;

  await app.listen(5000);
}
bootstrap();
