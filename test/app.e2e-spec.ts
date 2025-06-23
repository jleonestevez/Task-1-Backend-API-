import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ScraperController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/scraper/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/scraper/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'OK');
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/scraper/scrape (POST)', () => {
    return request(app.getHttpServer())
      .post('/scraper/scrape')
      .send({
        url: 'https://httpbin.org/html',
        selectors: ['h1']
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('url');
        expect(res.body).toHaveProperty('content');
        expect(res.body).toHaveProperty('timestamp');
      });
  });

  it('/scraper/scrape (POST) - invalid URL', () => {
    return request(app.getHttpServer())
      .post('/scraper/scrape')
      .send({
        url: 'invalid-url'
      })
      .expect(400);
  });
}); 