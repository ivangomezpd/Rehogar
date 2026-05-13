import request from 'supertest';
import app from '../server';

describe('Health Check', () => {
  it('should return 200 on /health', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
