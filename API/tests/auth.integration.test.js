import { describe, expect, it } from 'vitest';

const integration = process.env.RUN_AUTH_INTEGRATION === 'true' ? describe : describe.skip;
const baseUrl = process.env.AUTH_INTEGRATION_BASE_URL || 'http://localhost:3001/api/v1';

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

integration('native auth against PostgreSQL', () => {
  it('logs in a seeded native user, rotates refresh, detects replay and enforces revocation', async () => {
    const credentials = { email: 'leitor.teste@local.mybooks', password: 'TrocaLivros1!' };
    const loginResponse = await post('/auth/login', credentials);
    expect(loginResponse.status).toBe(200);
    const login = (await loginResponse.json()).data;

    const me = await fetch(`${baseUrl}/auth/me`, { headers: { authorization: `Bearer ${login.accessToken}` } });
    expect(me.status).toBe(200);

    const refreshResponse = await post('/auth/refresh', { refreshToken: login.refreshToken });
    expect(refreshResponse.status).toBe(200);
    const rotated = (await refreshResponse.json()).data;
    expect(rotated.refreshToken).not.toBe(login.refreshToken);

    const replay = await post('/auth/refresh', { refreshToken: login.refreshToken });
    expect(replay.status).toBe(401);

    const revokedFamily = await fetch(`${baseUrl}/auth/me`, { headers: { authorization: `Bearer ${rotated.accessToken}` } });
    expect(revokedFamily.status).toBe(401);

    const freshLogin = (await (await post('/auth/login', credentials)).json()).data;
    expect((await post('/auth/logout', { refreshToken: freshLogin.refreshToken })).status).toBe(200);
    const revoked = await fetch(`${baseUrl}/auth/me`, { headers: { authorization: `Bearer ${freshLogin.accessToken}` } });
    expect(revoked.status).toBe(401);
  });
});
