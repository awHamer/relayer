import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`NestJS GraphQL example running on http://localhost:${port}/graphql`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
