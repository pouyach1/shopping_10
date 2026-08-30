import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { verifyPassword } from '../src/utils/password';

const app = createApp();

const validUser = {
  firstName: 'سارا',
  lastName: 'محمدی',
  phone: '09121234567',
  email: 'customer@luxora.ir',
  password: 'demo1234a',
};

async function registerAndToken(
  overrides: Partial<typeof validUser> = {},
): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ ...validUser, ...overrides });
  expect(res.status).toBe(201);
  return res.body.data.accessToken as string;
}

describe('Health', () => {
  it('GET /api/v1/health is live', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/health/live is live', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/v1/health/ready reflects DB', async () => {
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.db).toBe('connected');
    expect(res.body.dbAvailability).toBe('available');
  });

  it('GET /api/health remains for compatibility', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });
});

describe('Auth registration', () => {
  it('registers a valid user and hashes password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validUser);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.phone).toBe('09121234567');
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const stored = await User.findOne({ phone: '09121234567' }).select(
      '+passwordHash',
    );
    expect(stored).toBeTruthy();
    expect(stored!.passwordHash).not.toBe(validUser.password);
    expect(await verifyPassword(validUser.password, stored!.passwordHash)).toBe(
      true,
    );
  });

  it('rejects invalid phone', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, phone: '12345', email: undefined });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, phone: undefined, email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  it('rejects weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, password: 'short' });
    expect(res.status).toBe(422);
  });

  it('rejects duplicate phone', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validUser, email: 'other@luxora.ir' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CONFLICT');
  });

  it('rejects duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        ...validUser,
        phone: '09120000000',
        email: 'customer@luxora.ir',
      });
    expect(res.status).toBe(409);
  });

  it('requires phone or email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      firstName: 'سارا',
      lastName: 'محمدی',
      password: 'demo1234a',
    });
    expect(res.status).toBe(422);
  });
});

describe('Auth login', () => {
  beforeEach(async () => {
    await request(app).post('/api/v1/auth/register').send(validUser);
  });

  it('logs in with phone', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: '09121234567',
      password: validUser.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTypeOf('string');
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('logs in with email', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: 'customer@luxora.ir',
      password: validUser.password,
    });
    expect(res.status).toBe(200);
  });

  it('rejects invalid credentials without leaking existence', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: '09121234567',
      password: 'wrong-pass1',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('اطلاعات ورود صحیح نیست.');
  });

  it('rejects inactive accounts', async () => {
    await User.updateOne({ phone: '09121234567' }, { isActive: false });
    const res = await request(app).post('/api/v1/auth/login').send({
      identifier: '09121234567',
      password: validUser.password,
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('حساب کاربری غیرفعال است.');
  });
});

describe('Authenticated /me', () => {
  it('returns current user with Bearer token', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('سارا');
  });

  it('rejects missing credentials', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
  });

  it('logout clears cookie and responds success', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

describe('Profile', () => {
  it('GET /api/v1/users/me', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('customer@luxora.ir');
  });

  it('PATCH allowed fields', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'نیما' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.firstName).toBe('نیما');
  });

  it('rejects role escalation', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('rejects passwordHash injection', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ passwordHash: 'hacked' });
    expect(res.status).toBe(400);
  });

  it('changes password via dedicated endpoint', async () => {
    const token = await registerAndToken();
    const res = await request(app)
      .post('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: validUser.password,
        newPassword: 'newPass123',
      });
    expect(res.status).toBe(200);

    const login = await request(app).post('/api/v1/auth/login').send({
      identifier: validUser.phone,
      password: 'newPass123',
    });
    expect(login.status).toBe(200);
  });

  it('adds and removes an address', async () => {
    const token = await registerAndToken();
    const add = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'منزل',
        recipientName: 'سارا محمدی',
        phone: '09121234567',
        province: 'تهران',
        city: 'تهران',
        addressLine: 'خیابان ولیعصر، پلاک ۱۲',
        isDefault: true,
      });
    expect(add.status).toBe(201);
    expect(add.body.data.user.addresses).toHaveLength(1);
    const addressId = add.body.data.user.addresses[0].id as string;

    const remove = await request(app)
      .delete(`/api/v1/users/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remove.status).toBe(200);
    expect(remove.body.data.user.addresses).toHaveLength(0);
  });
});

describe('Errors', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
