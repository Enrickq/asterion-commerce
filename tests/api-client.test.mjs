import test from 'node:test';
import assert from 'node:assert/strict';
import { api } from '../src/api.mjs';
import { createCore } from '../server/core.mjs';
import { createStore } from '../server/store.mjs';
import { createHttpServer } from '../server/index.mjs';
import { createPaymentAdapter } from '../server/connectors/paypal.mjs';
import { createEvidence } from '../server/connectors/weather.mjs';
import { verifyReceipt } from '../scripts/verify-receipt.mjs';

test('browser API client preserves complete downloadable settled and voided receipts', async t => {
  const store = createStore({ filePath: ':memory:' });
  const core = createCore({ store, paymentAdapter: createPaymentAdapter({ PAYMENTS_MODE: 'demo' }),
    evidenceProvider: input => createEvidence(input) });
  const server = createHttpServer({ core, env: { PUBLIC_DEMO: 'true' } });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    store.close();
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie;
  const fetchImpl = async (route, options) => {
    const response = await fetch(new URL(route, origin), { ...options,
      headers: { ...options.headers, ...(cookie ? { cookie } : {}) } });
    cookie = response.headers.get('set-cookie')?.split(';')[0] || cookie;
    return response;
  };
  const request = (path, body) => api(path, body, { fetchImpl });
  for (const scenario of ['clear', 'cloudy']) {
    let agreement = await request('/negotiate', { intent: 'Private stargazing for two in La Palma.', budgetMinor: 150000, participants: 2 });
    const root = `/agreements/${agreement.id}`;
    await request(`${root}/consent`, { agreementHash: agreement.hash });
    await request(`${root}/order`, {});
    await request(`${root}/authorize`, { agreementHash: agreement.hash });
    await request(`${root}/evaluate`, { scenario });
    agreement = await request(`${root}/execute`, {});
    if (agreement.status === 'CAPTURED') await request(`${root}/payouts`, {});
    const receipt = await request(`${root}/receipt`);
    assert.equal(receipt.schemaVersion, 'asterion.receipt.v1');
    assert.equal(receipt.status, scenario === 'clear' ? 'SETTLED' : 'VOIDED');
    assert.ok(receipt.payment.authorizationId);
    assert.ok(receipt.events.length > 5);
    assert.equal(receipt.integrity.eventCount, receipt.events.length);
    assert.equal(receipt.consent.agreementHash, receipt.agreementHash);
    assert.equal(verifyReceipt(receipt).valid, true);
  }
});
