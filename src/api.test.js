const request = require('supertest');
const express = require('express');

describe('API health check', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.get('/health', (req, res) => res.status(200).send('ok'));
  });

  it('should return 200 on /health', async () => {
    await request(app).get('/health').expect(200);
  });
});
