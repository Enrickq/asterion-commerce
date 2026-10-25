import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCore, hashObject } from '../server/core.mjs';
import { createStore } from '../server/store.mjs';
import { createPaymentAdapter } from '../server/connectors/paypal.mjs';
import { createEvidence } from '../server/connectors/weather.mjs';
import { verifyReceipt } from '../scripts/verify-receipt.mjs';

async function receipt(t, scenario = 'clear', { reconciliations = 0, sandbox = false, refund = null, autonomous = false, captureRefund = null } = {}) {
  const store = createStore({ filePath: ':memory:' });
  t.after(() => store.close());
  let clock = Date.parse('2026-10-25T20:00:00.000Z');
  const now = () => new Date(clock);
  const paymentAdapter = createPaymentAdapter({ PAYMENTS_MODE: 'demo' });
  if (captureRefund) {
    const originalCapture = paymentAdapter.capture;
    paymentAdapter.capture = async input => ({ ...await originalCapture(input), status: captureRefund });
  }
  const core = createCore({ store, paymentAdapter, now, evidenceProvider: input => createEvidence({ ...input, now }) });
  let agreement = await core.negotiate({ intent: 'A private night of stargazing for two in La Palma.', budgetMinor: 150000, participants: 2 });
  if (scenario === 'draft') return core.receipt(agreement.id);
  await core.consent(agreement.id, { agreementHash: agreement.hash });
  await core.createOrder(agreement.id);
  await core.authorize(agreement.id, { agreementHash: agreement.hash });
  if (autonomous) {
    await core.armAutopilot(agreement.id, { scenario });
    clock += 3500;
    await core.runDueAutopilots();
  } else {
    await core.evaluate(agreement.id, { scenario });
    agreement = await core.execute(agreement.id);
    if (agreement.status === 'CAPTURED') await core.payouts(agreement.id);
  }
  for (let index = 0; index < reconciliations; index++) await core.reconcile(agreement.id);
  if (refund) {
    paymentAdapter.reconcile = async () => ({ payment: { status: refund, captureStatus: refund } });
    await core.reconcile(agreement.id);
  }
  const result = core.receipt(agreement.id);
  if (sandbox) {
    // Synthetic metadata only: no provider requests. Rebuild the internal terms
    // and event hashes to exercise Sandbox interpretation, not authenticity.
    result.environment = result.agreement.paymentProvider = result.payment.provider = result.consent.provider = 'paypal-sandbox';
    result.payment.payouts.provider = 'paypal-sandbox';
    result.payment.payouts.simulated = false;
    result.payment.payouts.items.forEach(item => { item.currency = 'EUR'; });
    const previousAgreementHash = result.agreementHash;
    result.agreementHash = hashObject(result.agreement);
    result.consent.agreementHash = result.evaluation.agreementHash = result.agreementHash;
    for (const event of result.events) if (event.data.agreementHash === previousAgreementHash) event.data.agreementHash = result.agreementHash;
    rechain(result);
  }
  return result;
}

function rechain(value) {
  let previous = null;
  for (const event of value.events) {
    event.prevHash = previous;
    const { hash, ...payload } = event;
    event.hash = hashObject(payload);
    previous = event.hash;
  }
  value.integrity.lastEventHash = value.events.at(-1).hash;
  value.integrity.eventCount = value.events.length;
}

test('offline verifier accepts actual core receipt exports for draft, settled and voided demo states', async t => {
  for (const scenario of ['draft', 'clear', 'cloudy']) {
    const value = await receipt(t, scenario);
    const report = verifyReceipt(JSON.parse(JSON.stringify(value)));
    assert.equal(report.valid, true, JSON.stringify(report.checks.filter(check => !check.passed)));
    assert.equal(report.summary.environment, 'demo');
    assert.ok(report.warnings.some(warning => warning.includes('payments are simulated')));
  }
});

test('offline verification rejects sanitized public evidence summaries as a different format', () => {
  const summary = JSON.parse(readFileSync(new URL('../docs/evidence/ai-sandbox-run.json', import.meta.url), 'utf8'));
  const report = verifyReceipt(summary);
  assert.equal(report.valid, false);
  assert.equal(report.checks[0].id, 'receipt-format');
});

test('full exported history over 100 events verifies without silently truncating the chain', async t => {
  const value = await receipt(t, 'clear', { reconciliations: 110 });
  assert.ok(value.events.length > 100);
  const report = verifyReceipt(value);
  assert.equal(report.valid, true, JSON.stringify(report.checks.filter(check => !check.passed)));
  assert.equal(report.summary.eventCount, value.events.length);
});

test('changed approved amounts, hashes, event data, metadata and consent fail verification', async t => {
  const original = await receipt(t);
  for (const mutate of [
    value => { value.agreement.totalMinor++; },
    value => { value.agreementHash = 'a'.repeat(64); },
    value => { value.events[0].message = 'altered'; },
    value => { value.events[1].prevHash = null; },
    value => { value.integrity.eventCount--; },
    value => { value.integrity.lastEventHash = 'b'.repeat(64); },
    value => { value.events.splice(2, 1); },
    value => { value.consent.maxAmountMinor++; },
    value => { value.evidence.cloudPercent++; },
    value => { value.evaluation.eligible = false; },
  ]) {
    const value = structuredClone(original); mutate(value);
    assert.equal(verifyReceipt(value).valid, false);
  }
});

test('internally rehashed changes still fail amount and financial-reference consistency checks', async t => {
  const original = await receipt(t);
  for (const mutate of [
    value => { value.payment.captureId = 'SOME-OTHER-CAPTURE'; },
    value => { value.payment.orderId = 'SOME-OTHER-ORDER'; },
    value => { value.payment.payouts.items[0].amountMinor++; },
    value => { value.payment.payouts.items[0].senderItemId = 'FOREIGN-ITEM'; },
    value => { value.payment.payouts.items[1].allocationId = value.payment.payouts.items[0].allocationId; },
    value => { value.payment.payouts.items[1].payoutItemId = value.payment.payouts.items[0].payoutItemId; },
    value => { value.payment.payouts.items[0].status = 'PENDING'; },
    value => { value.payment.payouts = null; },
    value => { value.payment.status = value.status = 'VOIDED'; },
  ]) {
    const value = structuredClone(original); mutate(value); rechain(value);
    assert.equal(verifyReceipt(value).valid, false);
  }
});

test('synthetic Sandbox metadata remains test funds and never establishes provider authenticity', async t => {
  const report = verifyReceipt(await receipt(t, 'clear', { sandbox: true }));
  assert.equal(report.valid, true, JSON.stringify(report.checks.filter(check => !check.passed)));
  assert.equal(report.summary.environment, 'paypal-sandbox');
  assert.ok(report.warnings.some(warning => warning.includes('test accounts and test funds')));
  assert.match(report.scope, /not a PayPal\/Google signature/);
});

test('a later refund retains a verifiable historical autonomous outcome without claiming net settlement', async t => {
  for (const refund of ['REFUNDED', 'PARTIALLY_REFUNDED']) {
    const value = await receipt(t, 'clear', { refund, autonomous: true });
    const report = verifyReceipt(value);
    assert.equal(report.valid, true, JSON.stringify(report.checks.filter(item => !item.passed)));
    assert.equal(value.autopilot.outcome, 'SETTLED');
    assert.equal(report.summary.status, refund);
    assert.ok(report.warnings.some(item => item.includes('historical obligations')));
    value.payment.status = 'COMPLETED';
    assert.equal(verifyReceipt(value).valid, false);
  }
});

test('a refund reported with the capture response is verifiable without claiming supplier settlement', async t => {
  const value = await receipt(t, 'clear', { captureRefund: 'REFUNDED' });
  const report = verifyReceipt(value);
  assert.equal(report.valid, true, JSON.stringify(report.checks.filter(item => !item.passed)));
  assert.equal(value.payment.payouts, null);
  assert.equal(report.summary.status, 'REFUNDED');
});
