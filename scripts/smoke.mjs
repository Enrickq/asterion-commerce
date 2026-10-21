import assert from 'node:assert/strict';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../server/index.mjs';
import { setTimeout as delay } from 'node:timers/promises';

// Start an isolated local server. Never use the operator's .env or existing database.
const root = fileURLToPath(new URL('../', import.meta.url));
assert.ok(existsSync(join(root, 'dist', 'index.html')), 'Build the frontend first: pnpm build');
const dataDir = await mkdtemp(join(tmpdir(), 'asterion-smoke-'));
let running;
try {
  running = startServer({
    HOST: '127.0.0.1', PORT: '0', DATA_DIR: dataDir, NODE_ENV: 'test',
    PAYMENTS_MODE: 'demo', AGENT_MODE: 'deterministic', WEATHER_MODE: 'fixtures', PUBLIC_DEMO: 'true',
  });
  await once(running.server, 'listening');
  const origin = `http://127.0.0.1:${running.server.address().port}`;
  let cookie = '';
  const request = async (path, input) => {
    const response = await fetch(origin + path, {
      headers: { ...(cookie && { cookie }), ...(input !== undefined && { 'content-type': 'application/json' }) },
      ...(input !== undefined && { method: 'POST', body: JSON.stringify(input) }),
    });
    const newCookie = response.headers.get('set-cookie');
    if (newCookie) cookie = newCookie.split(';')[0];
    const data = await response.json();
    assert.ok(response.ok, `${path}: expected success, got ${response.status} (${data.error?.code || 'unknown'})`);
    return data;
  };
  const status = await request('/api/status');
  assert.equal(status.mode, 'demo');
  assert.equal(status.publicDemo, true);
  assert.equal(status.storage, 'sqlite');
  const page = await fetch(origin + '/');
  assert.equal(page.status, 200);
  assert.match(await page.text(), /ASTERION/i);
  process.stdout.write('PASS: built frontend and isolated demo API are reachable.\n');

  async function scenario(name, autonomous = false) {
    let agreement = await request('/api/negotiate', {
      intent: 'Private stargazing in La Palma with guide, telescope and transport.',
      budgetMinor: 150000, participants: 2,
    });
    const path = `/api/agreements/${agreement.id}`;
    agreement = await request(path + '/consent', { agreementHash: agreement.hash });
    agreement = await request(path + '/order', {});
    agreement = await request(path + '/authorize', { agreementHash: agreement.hash, orderId: agreement.payment.orderId });
    const original = { id: agreement.id, hash: agreement.hash, orderId: agreement.payment.orderId, authorizationId: agreement.payment.authorizationId };
    const eligible = name === 'clear';
    if (autonomous) {
      // Only arm the job. Every subsequent client request is a GET: the server does the work.
      agreement = await request(path + '/autopilot', { scenario: name });
      assert.equal(agreement.autopilot.status, 'ARMED');
      const jobId = agreement.autopilot.id;
      const deadline = Date.now() + 12000;
      while (['ARMED', 'RUNNING'].includes(agreement.autopilot.status) && Date.now() < deadline) {
        await delay(250);
        agreement = await request(path);
      }
      assert.equal(agreement.autopilot.status, 'COMPLETED', 'Server-side autopilot must finish without manual evaluate, execute or payouts calls.');
      assert.equal(agreement.autopilot.id, jobId);
      assert.equal(agreement.autopilot.outcome, eligible ? 'SETTLED' : 'VOIDED');
      assert.equal(agreement.status, eligible ? 'SETTLED' : 'VOIDED');
    } else {
      agreement = await request(path + '/evaluate', { scenario: name });
      assert.equal(agreement.evaluation.eligible, eligible);
      agreement = await request(path + '/execute', {});
      assert.equal(agreement.status, eligible ? 'CAPTURED' : 'VOIDED');
      if (eligible) {
        agreement = await request(path + '/payouts', {});
        assert.equal(agreement.status, 'SETTLED');
      }
    }
    if (!eligible) assert.equal(agreement.payment.captureId, null);
    assert.equal(agreement.id, original.id);
    assert.equal(agreement.hash, original.hash);
    assert.equal(agreement.payment.orderId, original.orderId);
    assert.equal(agreement.payment.authorizationId, original.authorizationId);
    const receipt = await request(path + '/receipt');
    assert.equal(receipt.integrity.agreementHashValid, true);
    assert.equal(receipt.integrity.eventChainValid, true);
    assert.equal(receipt.environment, 'demo');
    assert.equal(receipt.agreement.id, original.id);
    assert.equal(receipt.payment.authorizationId, original.authorizationId);
    if (autonomous) assert.equal(receipt.autopilot.id, agreement.autopilot.id);
    process.stdout.write(`PASS: ${autonomous ? 'AUTONOMOUS ' : ''}${name} evidence → ${agreement.status}; persisted IDs and receipt integrity valid.\n`);
  }
  await scenario('clear');
  await scenario('cloudy');
  await scenario('stale');
  await scenario('clear', true);
  await scenario('cloudy', true);
} finally {
  if (running) {
    await new Promise((done, reject) => {
      running.server.close((error) => error ? reject(error) : done());
      running.server.closeAllConnections();
    });
    running.store.close();
  }
  // Only remove the unique temporary directory created by this script.
  if (dirname(resolve(dataDir)) !== resolve(tmpdir()) || !/^asterion-smoke-/.test(basename(dataDir))) {
    throw new Error('Refusing to remove a path outside the smoke-test temporary directory.');
  }
  await rm(dataDir, { recursive: true, force: true });
}
