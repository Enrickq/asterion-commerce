import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createCore, canonicalize, computeAgreementHash, verifyEventChain } from '../server/core.mjs';
import { createStore } from '../server/store.mjs';
import { createHttpServer, startServer } from '../server/index.mjs';

function fixture(t, options = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'asterion-core-'));
  let store = createStore({ dataDir: directory });
  let time = new Date('2026-10-21T18:00:00.000Z');
  const calls = { order: 0, authorize: 0, capture: 0, void: 0, payouts: 0, keys: [] };
  const adapter = {
    mode: 'demo',
    async createOrder() { calls.order++; return { orderId: 'ORDER-1', status: 'CREATED' }; },
    async authorize() { calls.authorize++; return { authorizationId: 'AUTH-1', status: 'CREATED' }; },
    async capture(input) {
      calls.capture++;
      calls.keys.push(input.idempotencyKey);
      assert.equal(input.amountMinor, 148000);
      assert.equal(input.currency, 'EUR');
      if (options.captureDelay) await new Promise(resolve => setTimeout(resolve, 20));
      if (options.captureThrows) throw new Error('access_token=DO-NOT-EXPOSE');
      return { captureId: 'CAPTURE-1', status: options.captureStatus ?? 'COMPLETED' };
    },
    async void() { calls.void++; return { status: 'VOIDED' }; },
    async payouts() {
      calls.payouts++;
      return { batchId: 'BATCH-1', status: 'SUCCESS', items: ['guide', 'telescope', 'transport'].map(allocationId => ({ allocationId, status: 'SUCCESS' })) };
    },
    async reconcile() { return options.reconciled ?? (options.captureThrows ? { payment: { status: 'PENDING' } } : { payment: { captureId: 'CAPTURE-1', status: 'COMPLETED' } }); },
    ...options.adapter,
  };
  const evidenceProvider = async ({ scenario }) => ({
    observedAt: new Date(+time - (scenario === 'stale' ? 601000 : 10000)).toISOString(),
    cloudPercent: scenario === 'cloudy' ? 72 : 5,
    windKph: 9,
    humidityPercent: 40,
    conflict: scenario === 'conflict',
    scenario,
    simulated: true,
    sources: [{ name: 'Demo meteo' }, { name: 'Demo sensor local' }],
  });
  const create = () => createCore({ store, paymentAdapter: adapter, evidenceProvider: options.evidenceProvider ?? evidenceProvider, now: () => new Date(time), allowSandboxAutopilot: options.allowSandboxAutopilot ?? false });
  let core = create();
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }); });
  return {
    get core() { return core; }, get store() { return store; }, calls, adapter,
    advance(milliseconds) { time = new Date(+time + milliseconds); },
    reopen() { store.close(); store = createStore({ dataDir: directory }); core = create(); },
    async negotiated() { return core.negotiate({ intent: 'Dos personas quieren observar las estrellas en La Palma.', budgetMinor: 150000, participants: 2 }); },
    async authorized() {
      let agreement = await this.negotiated();
      await core.consent(agreement.id, { agreementHash: agreement.hash });
      await core.createOrder(agreement.id);
      return core.authorize(agreement.id, { agreementHash: agreement.hash });
    },
  };
}

test('canonical JSON is stable across key insertion orders', () => {
  assert.equal(canonicalize({ z: 1, nested: { b: 2, a: 3 } }), canonicalize({ nested: { a: 3, b: 2 }, z: 1 }));
  assert.throws(() => canonicalize({ value: Infinity }));
});

test('authorization and order creation require exact consent; no provider side effects', async t => {
  const f = fixture(t);
  const agreement = await f.negotiated();
  await assert.rejects(f.core.createOrder(agreement.id), { code: 'CONSENT_REQUIRED' });
  await assert.rejects(f.core.consent(agreement.id, { agreementHash: 'wrong' }), { code: 'HASH_MISMATCH' });
  await assert.rejects(f.core.authorize(agreement.id, { agreementHash: agreement.hash }), { code: 'CONSENT_REQUIRED' });
  assert.equal(f.calls.order, 0);
  assert.equal(f.calls.authorize, 0);
});

test('authorization rejects order substitution and a different approved hash', async t => {
  const f = fixture(t);
  const agreement = await f.negotiated();
  await f.core.consent(agreement.id, { agreementHash: agreement.hash });
  await f.core.createOrder(agreement.id);
  await assert.rejects(f.core.authorize(agreement.id, { agreementHash: 'wrong' }), { code: 'HASH_MISMATCH' });
  await assert.rejects(f.core.authorize(agreement.id, { agreementHash: agreement.hash, orderId: 'SOMEONE-ELSES-ORDER' }), { code: 'ORDER_MISMATCH' });
  assert.equal(f.calls.authorize, 0);
});

test('clear conditions allow one exact capture and only then three separate payouts', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  const evaluated = await f.core.evaluate(agreement.id, { scenario: 'clear' });
  assert.equal(evaluated.evaluation.eligible, true);
  assert.equal(evaluated.evaluation.checks.length, 6);
  const captured = await f.core.execute(agreement.id);
  assert.equal(captured.status, 'CAPTURED');
  assert.equal(captured.payment.status, 'COMPLETED');
  const settled = await f.core.payouts(agreement.id);
  assert.equal(settled.status, 'SETTLED');
  assert.equal(settled.payment.payouts.items.length, 3);
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.payouts, 1);
  assert.equal(settled.totalMinor, settled.allocations.reduce((sum, item) => sum + item.amountMinor, 0));
  const receipt = f.core.receipt(agreement.id);
  assert.equal(receipt.integrity.agreementHashValid, true);
  assert.equal(receipt.integrity.eventChainValid, true);
  assert.equal(receipt.agreementHash, agreement.hash);
  assert.equal(receipt.payment.captureId, 'CAPTURE-1');
});

for (const scenario of ['cloudy', 'stale', 'conflict']) {
  test(`${scenario} fails closed and voids the authorization without capturing`, async t => {
    const f = fixture(t);
    const agreement = await f.authorized();
    const evaluated = await f.core.evaluate(agreement.id, { scenario });
    assert.equal(evaluated.evaluation.eligible, false);
    assert.ok(evaluated.evaluation.reasons.length > 0);
    const result = await f.core.execute(agreement.id);
    assert.equal(result.status, 'VOIDED');
    assert.equal(f.calls.capture, 0);
    assert.equal(f.calls.void, 1);
    await assert.rejects(f.core.payouts(agreement.id), { code: 'CAPTURE_NOT_COMPLETED' });
  });
}

test('a previously green evaluation is rechecked at capture time', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  f.advance(11 * 60 * 1000);
  const result = await f.core.execute(agreement.id);
  assert.equal(result.status, 'VOIDED');
  assert.match(result.evaluation.reasons.join(' '), /caducado/);
  assert.equal(f.calls.capture, 0);
});

test('missing meteorological data permits voiding, never capture', async t => {
  const f = fixture(t, { evidenceProvider: async () => null });
  const agreement = await f.authorized();
  await assert.rejects(f.core.execute(agreement.id), { code: 'EVIDENCE_REQUIRED' });
  const evaluated = await f.core.evaluate(agreement.id, { scenario: 'clear' });
  assert.equal(evaluated.evaluation.eligible, false);
  const result = await f.core.execute(agreement.id);
  assert.equal(result.status, 'VOIDED');
  assert.equal(f.calls.capture, 0);
  assert.equal(f.calls.void, 1);
});

test('changed business terms and changed evidence cannot reuse approval', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  const modifiedEvidence = f.store.get(agreement.id);
  modifiedEvidence.evidence.windKph = 10;
  f.store.save(modifiedEvidence);
  await assert.rejects(f.core.execute(agreement.id), { code: 'EVIDENCE_MISMATCH' });
  const modifiedTerms = f.store.get(agreement.id);
  modifiedTerms.policy.maxCloudPercent = 100;
  f.store.save(modifiedTerms);
  await assert.rejects(f.core.execute(agreement.id), { code: 'INTEGRITY_MISMATCH' });
  assert.equal(f.calls.capture, 0);
});

test('concurrent execute requests are serialized and capture once', async t => {
  const f = fixture(t, { captureDelay: true });
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  const results = await Promise.all([f.core.execute(agreement.id), f.core.execute(agreement.id), f.core.execute(agreement.id)]);
  assert.ok(results.every(result => result.status === 'CAPTURED'));
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.keys.length, 1);
});

test('payouts remain blocked for pending captures and unlock only after reconciliation', async t => {
  const f = fixture(t, { captureStatus: 'PENDING' });
  const agreement = await f.authorized();
  await assert.rejects(f.core.payouts(agreement.id), { code: 'CAPTURE_NOT_COMPLETED' });
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  const pending = await f.core.execute(agreement.id);
  assert.equal(pending.status, 'CAPTURE_PENDING');
  await assert.rejects(f.core.execute(agreement.id), { code: 'RECONCILE_REQUIRED' });
  await assert.rejects(f.core.payouts(agreement.id), { code: 'CAPTURE_NOT_COMPLETED' });
  await f.core.reconcile(agreement.id);
  await f.core.payouts(agreement.id);
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.payouts, 1);
});

test('uncertain capture responses persist pending state and never leak provider errors', async t => {
  const f = fixture(t, { captureThrows: true });
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  await assert.rejects(f.core.execute(agreement.id), { code: 'PAYMENT_UNCONFIRMED' });
  const saved = f.core.get(agreement.id);
  assert.equal(saved.payment.status, 'CAPTURE_PENDING');
  assert.ok(!JSON.stringify(saved).includes('DO-NOT-EXPOSE'));
  await assert.rejects(f.core.execute(agreement.id), { code: 'RECONCILE_REQUIRED' });
  assert.equal(f.calls.capture, 1);
});

test('a lost capture response is recovered by querying the provider in the same request', async t => {
  const f = fixture(t, { captureThrows: true, reconciled: { payment: { captureId: 'CAPTURE-1', status: 'COMPLETED' } } });
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  const result = await f.core.execute(agreement.id);
  assert.equal(result.status, 'CAPTURED');
  assert.equal(result.payment.captureId, 'CAPTURE-1');
  assert.equal(result.payment.lastError, null);
  assert.ok(result.events.some(event => event.type === 'CAPTURE_RECOVERED'));
  await f.core.execute(agreement.id);
  assert.equal(f.calls.capture, 1);
});

test('failed reconciliation after a lost capture response preserves uncertainty', async t => {
  const f = fixture(t, { captureThrows: true, adapter: { async reconcile() { throw new Error('read failed'); } } });
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  await assert.rejects(f.core.execute(agreement.id), { code: 'PAYMENT_UNCONFIRMED' });
  assert.equal(f.core.get(agreement.id).payment.status, 'CAPTURE_PENDING');
  await assert.rejects(f.core.execute(agreement.id), { code: 'RECONCILE_REQUIRED' });
  assert.equal(f.calls.capture, 1);
});

test('SQLite survives a restart with immutable terms, consent and event chain', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  f.reopen();
  const restored = f.core.get(agreement.id);
  assert.equal(restored.hash, agreement.hash);
  assert.equal(computeAgreementHash(restored), agreement.hash);
  assert.equal(restored.consent.agreementHash, agreement.hash);
  assert.equal(verifyEventChain(restored.events), true);
  await f.core.execute(agreement.id);
  assert.equal(f.core.get(agreement.id).status, 'CAPTURED');
});

test('payout idempotency survives concurrent requests and restarts', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.evaluate(agreement.id, { scenario: 'clear' });
  await f.core.execute(agreement.id);
  await Promise.all([f.core.payouts(agreement.id), f.core.payouts(agreement.id)]);
  f.reopen();
  await f.core.payouts(agreement.id);
  assert.equal(f.calls.payouts, 1);
});

test('expired agreement and out-of-budget negotiation do not reach payment adapters', async t => {
  const f = fixture(t);
  await assert.rejects(f.core.negotiate({ intent: 'Una experiencia premium en La Palma', budgetMinor: 100000 }), { code: 'BUDGET_EXCEEDED' });
  const agreement = await f.negotiated();
  f.advance(3 * 60 * 60 * 1000);
  await assert.rejects(f.core.consent(agreement.id, { agreementHash: agreement.hash }), { code: 'AGREEMENT_EXPIRED' });
  assert.equal(f.calls.order, 0);
});

test('event tampering is detected and live adapters are refused', async t => {
  const f = fixture(t);
  const agreement = await f.negotiated();
  const changed = f.store.get(agreement.id);
  changed.events[0].message = 'forged';
  f.store.save(changed);
  assert.throws(() => f.core.get(agreement.id), { code: 'INTEGRITY_MISMATCH' });
  assert.throws(() => createCore({ store: f.store, paymentAdapter: { mode: 'paypal-live' } }), /Sandbox/);
});

test('autopilot is durable, returns ARMED before capture, and runs after its deadline', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  const armed = await f.core.armAutopilot(agreement.id, { scenario: 'clear' });
  assert.equal(armed.autopilot.status, 'ARMED');
  assert.equal(f.calls.capture, 0);
  assert.equal((await f.core.runDueAutopilots()).processed, 0);
  await assert.rejects(f.core.evaluate(agreement.id, { scenario: 'clear' }), { code: 'AUTOPILOT_ACTIVE' });
  await assert.rejects(f.core.execute(agreement.id), { code: 'AUTOPILOT_ACTIVE' });
  f.advance(3001);
  assert.equal((await f.core.runDueAutopilots()).processed, 1);
  const finished = f.core.get(agreement.id);
  assert.equal(finished.status, 'SETTLED');
  assert.equal(finished.autopilot.status, 'COMPLETED');
  assert.equal(finished.autopilot.outcome, 'SETTLED');
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.payouts, 1);
  assert.equal((await f.core.runDueAutopilots()).processed, 0);
  await assert.rejects(f.core.armAutopilot(agreement.id, { scenario: 'clear' }), { code: 'AUTOPILOT_ALREADY_ARMED' });
  assert.equal(verifyEventChain(finished.events), true);
});

for (const scenario of ['cloudy', 'stale', 'conflict']) {
  test(`autopilot ${scenario} voids without another user action or provider payouts`, async t => {
    const f = fixture(t);
    const agreement = await f.authorized();
    await f.core.armAutopilot(agreement.id, { scenario });
    f.advance(3001);
    await f.core.runDueAutopilots();
    const finished = f.core.get(agreement.id);
    assert.equal(finished.autopilot.status, 'COMPLETED');
    assert.equal(finished.autopilot.outcome, 'VOIDED');
    assert.equal(f.calls.capture, 0);
    assert.equal(f.calls.void, 1);
    assert.equal(f.calls.payouts, 0);
  });
}

test('an armed job is recovered from SQLite after restart, with one capture', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.armAutopilot(agreement.id, { scenario: 'clear' });
  f.reopen();
  assert.equal(f.core.get(agreement.id).autopilot.status, 'ARMED');
  f.advance(3001);
  await Promise.all([f.core.runDueAutopilots(), f.core.runDueAutopilots()]);
  assert.equal(f.core.get(agreement.id).status, 'SETTLED');
  assert.equal(f.calls.capture, 1);
});

test('recovery after a persisted capture resumes payouts without capturing again', async t => {
  const f = fixture(t);
  const agreement = await f.authorized();
  await f.core.armAutopilot(agreement.id, { scenario: 'clear' });
  // Simulate a process stopping between its confirmed capture and the next workflow step.
  await f.core.evaluate(agreement.id, { scenario: 'clear' }, { autopilot: true });
  await f.core.execute(agreement.id, {}, { autopilot: true });
  const interrupted = f.store.get(agreement.id);
  interrupted.autopilot.status = 'RUNNING';
  f.store.save(interrupted);
  f.reopen();
  f.advance(3001);
  await f.core.runDueAutopilots();
  assert.equal(f.core.get(agreement.id).status, 'SETTLED');
  assert.equal(f.calls.capture, 1);
  assert.equal(f.calls.payouts, 1);
});

test('failed autopilot jobs stay terminal and expose only a safe error', async t => {
  const f = fixture(t, { adapter: { async payouts() { throw new Error('DO-NOT-EXPOSE-SECRET'); } } });
  const agreement = await f.authorized();
  await f.core.armAutopilot(agreement.id, { scenario: 'clear' });
  f.advance(3001);
  await f.core.runDueAutopilots();
  const result = f.core.get(agreement.id);
  assert.equal(result.autopilot.status, 'FAILED');
  assert.ok(!JSON.stringify(result).includes('DO-NOT-EXPOSE-SECRET'));
  assert.equal((await f.core.runDueAutopilots()).processed, 0);
  assert.equal(f.calls.capture, 1);
});

test('autopilot cannot run before consent/authorization and Sandbox needs explicit opt-in', async t => {
  const f = fixture(t, { adapter: { mode: 'paypal-sandbox' } });
  const proposed = await f.negotiated();
  await assert.rejects(f.core.armAutopilot(proposed.id, { scenario: 'clear' }), { code: 'CONSENT_REQUIRED' });
  const agreement = await f.authorized();
  await assert.rejects(f.core.armAutopilot(agreement.id, { scenario: 'clear', confirmSandboxAutopilot: true, agreementHash: agreement.hash }), { code: 'SANDBOX_AUTOPILOT_DISABLED' });
  assert.equal(f.calls.capture, 0);
});

test('HTTP API rejects cross-origin mutation, malformed JSON and oversized bodies', async t => {
  const f = fixture(t);
  const server = createHttpServer({ core: f.core, env: { NODE_ENV: 'production' }, integrationStatus: () => [] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const crossOrigin = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://attacker.example' }, body: '{}' });
  assert.equal(crossOrigin.status, 403);
  const invalid = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(invalid.status, 400);
  const oversized = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intent: 'x'.repeat(70000) }) });
  assert.equal(oversized.status, 413);
  const status = await fetch(`${base}/api/status`);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).paymentProvider, 'demo');
  const list = await fetch(`${base}/api/agreements`);
  assert.deepEqual(await list.json(), { agreements: [] });
});

test('HTTP mutation returns the persisted agreement and export is a JSON attachment', async t => {
  const f = fixture(t);
  const server = createHttpServer({ core: f.core, env: {}, integrationStatus: () => [] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json', origin: 'http://localhost:5173' }, body: JSON.stringify({ intent: 'Experiencia privada de observación astronómica', budgetMinor: 150000, participants: 2 }) });
  assert.equal(response.status, 201);
  const agreement = await response.json();
  assert.equal(agreement.status, 'NEGOTIATED');
  const cookie = response.headers.get('set-cookie').split(';')[0];
  const receipt = await fetch(`${base}/api/agreements/${agreement.id}/receipt`, { headers: { Cookie: cookie } });
  assert.match(receipt.headers.get('content-disposition'), /attachment; filename="asterion-/);
  assert.equal((await receipt.json()).integrity.eventChainValid, true);
});

test('signed browser sessions isolate lists, reads, receipts and mutations', async t => {
  const f = fixture(t);
  const server = createHttpServer({ core: f.core, env: { NODE_ENV: 'production', PUBLIC_DEMO: 'true' }, integrationStatus: () => [] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const create = async () => {
    const response = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ intent: 'Una experiencia premium bajo las estrellas de La Palma', budgetMinor: 150000, ownerId: 'caller-must-not-choose-this' }) });
    assert.equal(response.status, 201);
    assert.match(response.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
    assert.match(response.headers.get('content-security-policy'), /fonts\.googleapis\.com/);
    return { agreement: await response.json(), cookie: response.headers.get('set-cookie').split(';')[0] };
  };
  const alice = await create();
  const bob = await create();
  assert.notEqual(alice.agreement.ownerId, bob.agreement.ownerId);
  assert.notEqual(alice.agreement.ownerId, 'caller-must-not-choose-this');
  const aliceList = await fetch(`${base}/api/agreements`, { headers: { Cookie: alice.cookie } });
  assert.deepEqual((await aliceList.json()).agreements.map(item => item.id), [alice.agreement.id]);
  const bobList = await fetch(`${base}/api/agreements`, { headers: { Cookie: bob.cookie } });
  assert.deepEqual((await bobList.json()).agreements.map(item => item.id), [bob.agreement.id]);
  for (const suffix of ['', '/receipt']) {
    const otherRead = await fetch(`${base}/api/agreements/${alice.agreement.id}${suffix}`, { headers: { Cookie: bob.cookie } });
    assert.equal(otherRead.status, 404);
  }
  const otherConsent = await fetch(`${base}/api/agreements/${alice.agreement.id}/consent`, { method: 'POST', headers: { 'content-type': 'application/json', Cookie: bob.cookie }, body: JSON.stringify({ agreementHash: alice.agreement.hash }) });
  assert.equal(otherConsent.status, 404);
  const forged = alice.cookie.slice(0, -1) + (alice.cookie.endsWith('A') ? 'B' : 'A');
  const forgedRead = await fetch(`${base}/api/agreements/${alice.agreement.id}`, { headers: { Cookie: forged } });
  assert.equal(forgedRead.status, 404);
  const noCookie = await fetch(`${base}/api/agreements/${alice.agreement.id}/execute`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(noCookie.status, 404);
  const ownConsent = await fetch(`${base}/api/agreements/${alice.agreement.id}/consent`, { method: 'POST', headers: { 'content-type': 'application/json', Cookie: alice.cookie }, body: JSON.stringify({ agreementHash: alice.agreement.hash }) });
  assert.equal(ownConsent.status, 200);
  assert.equal(f.calls.order, 0);
  assert.equal(f.calls.capture, 0);
});

test('PUBLIC_DEMO refuses Sandbox and prevents public launches of paid browser sessions', async t => {
  const f = fixture(t);
  let launched = 0;
  const server = createHttpServer({ core: f.core, env: { PUBLIC_DEMO: 'true' }, integrationStatus: () => [], kernelSession: async () => { launched++; return { id: 'external-session' }; } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/integrations/kernel/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 403);
  assert.equal(launched, 0);
  assert.throws(() => createHttpServer({ core: { provider: 'paypal-sandbox' }, env: { PUBLIC_DEMO: 'true' } }), /simulados/);
});

test('public sessions have a bounded negotiation budget and API rate', async t => {
  const f = fixture(t);
  await assert.rejects(f.core.negotiate({ intent: 'No debe aceptar un presupuesto sin límite', budgetMinor: 10_000_001 }), { code: 'INVALID_BUDGET' });
  await assert.rejects(f.core.negotiate({ intent: 'x'.repeat(4001), budgetMinor: 150000 }), { code: 'INVALID_INTENT' });
  const server = createHttpServer({ core: f.core, env: { PUBLIC_DEMO: 'true' }, integrationStatus: () => [] });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie;
  for (let index = 0; index < 13; index++) {
    const response = await fetch(`${base}/api/negotiate`, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie && { Cookie: cookie }) }, body: JSON.stringify({ intent: 'Experiencia privada de astronomía en Canarias', budgetMinor: 150000 }) });
    cookie ??= response.headers.get('set-cookie')?.split(';')[0];
    assert.equal(response.status, index < 12 ? 201 : 429);
    if (index === 12) assert.ok(Number(response.headers.get('retry-after')) > 0);
    await response.arrayBuffer();
  }
});

test('the HTTP autopilot responds before capture, then the server worker completes without another command', { timeout: 10000 }, async t => {
  const directory = mkdtempSync(join(tmpdir(), 'asterion-autopilot-http-'));
  const running = startServer({ PORT: '0', HOST: '127.0.0.1', DATA_DIR: directory, NODE_ENV: 'test', PUBLIC_DEMO: 'true', PAYMENTS_MODE: 'demo', AGENT_MODE: 'deterministic', WEATHER_MODE: 'fixtures' });
  await once(running.server, 'listening');
  t.after(async () => {
    await new Promise(resolve => { running.server.close(resolve); running.server.closeAllConnections(); });
    await running.core.waitForAutopilotIdle();
    running.store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${running.server.address().port}`;
  let cookie;
  const request = async (path, input) => {
    const response = await fetch(base + path, { headers: { ...(cookie && { Cookie: cookie }), ...(input !== undefined && { 'content-type': 'application/json' }) }, ...(input !== undefined && { method: 'POST', body: JSON.stringify(input) }) });
    cookie ??= response.headers.get('set-cookie')?.split(';')[0];
    const value = await response.json();
    assert.ok(response.ok, `${path}: ${JSON.stringify(value)}`);
    return value;
  };
  let agreement = await request('/api/negotiate', { intent: 'Experiencia privada de estrellas en La Palma, flexibilidad de 20 minutos.', budgetMinor: 150000, participants: 2 });
  const path = `/api/agreements/${agreement.id}`;
  await request(`${path}/consent`, { agreementHash: agreement.hash });
  await request(`${path}/order`, {});
  await request(`${path}/authorize`, { agreementHash: agreement.hash });
  agreement = await request(`${path}/autopilot`, { scenario: 'clear' });
  assert.equal(agreement.autopilot.status, 'ARMED');
  assert.equal(agreement.payment.captureId, null);
  const deadline = Date.now() + 6000;
  while (['ARMED', 'RUNNING'].includes(agreement.autopilot.status) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 60));
    agreement = await request(path);
  }
  assert.equal(agreement.autopilot.status, 'COMPLETED');
  assert.equal(agreement.status, 'SETTLED');
  assert.ok(agreement.payment.captureId.startsWith('DEMO-'));
  assert.equal(agreement.payment.payouts.items.length, 3);
  assert.equal(agreement.events.filter(event => event.type === 'CAPTURE_REQUESTED').length, 1);
});
