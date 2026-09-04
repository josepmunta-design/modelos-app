import test from 'node:test';
import assert from 'node:assert/strict';

process.env.GITHUB_OWNER = 'example';
process.env.GITHUB_REPO = 'data';
process.env.GITHUB_TOKEN = 'test-token';
process.env.GITHUB_REQUEST_ATTEMPTS = '3';
process.env.GITHUB_RETRY_BASE_MS = '100';

const { githubRequest } = await import('./build-model-pages.mjs?retry-test');

test('githubRequest retries a transient GitHub error', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response('', { status: 504 });
    return Response.json({ ok: true });
  };

  assert.deepEqual(await githubRequest('data/example.json', { raw: true }), { ok: true });
  assert.equal(calls, 2);
});

test('githubRequest does not retry a permanent GitHub error', async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('', { status: 404 });
  };

  await assert.rejects(
    githubRequest('data/missing.json'),
    /tras 1 intento: HTTP 404/
  );
  assert.equal(calls, 1);
});
