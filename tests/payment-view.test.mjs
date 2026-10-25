import test from 'node:test';
import assert from 'node:assert/strict';
import { getExecutionMessage, getPaymentSteps } from '../src/payment-view.mjs';

const allocations = [{ id: 'guide', amountMinor: 42500 }, { id: 'telescope', amountMinor: 62000 }, { id: 'transport', amountMinor: 42500 }, { id: 'organizer', amountMinor: 18000 }];
const agreement = (status = 'SETTLED') => ({ status, currency: 'EUR', allocations, evaluation: { eligible: true },
  payment: { status: 'COMPLETED', authorizationId: 'AUTH-1', captureId: 'CAPTURE-1', payouts: { status: 'SUCCESS', items: allocations.slice(0, 3).map(value => ({ allocationId: value.id, status: 'SUCCESS', amountMinor: value.amountMinor, currency: 'EUR' })) } } });
const step = (value, id) => getPaymentSteps(value).find(item => item.id === id);

test('uncertain and declined outcomes never show a capture success', () => {
  assert.match(getExecutionMessage(agreement('VOID_PENDING')), /void is not confirmed/);
  assert.match(getExecutionMessage(agreement('CAPTURE_FAILED')), /declined/);
  assert.match(getExecutionMessage(agreement('CAPTURE_PENDING')), /awaiting confirmation/);
  for (const status of ['VOID_PENDING', 'CAPTURE_FAILED', 'CAPTURE_PENDING', 'UNKNOWN']) {
    assert.doesNotMatch(getExecutionMessage(agreement(status)), /^Capture confirmed|all three supplier payments are confirmed/);
    assert.equal(step(agreement(status), 'capture').complete, false);
    assert.equal(step(agreement(status), 'payouts').complete, false);
  }
});

test('capture and supplier completion are represented as separate milestones', () => {
  for (const status of ['CAPTURED', 'PAYOUTS_PENDING']) {
    const value = agreement(status);
    assert.equal(step(value, 'capture').complete, true);
    assert.equal(step(value, 'payouts').complete, false);
    assert.equal(step(value, 'payouts').active, true);
    assert.doesNotMatch(getExecutionMessage(value), /all three supplier payments are confirmed/);
  }
  assert.equal(step(agreement(), 'payouts').complete, true);
  assert.match(getExecutionMessage(agreement()), /all three supplier payments are confirmed/);
});

test('a settled label cannot turn missing, partial, duplicated or foreign supplier items into success', () => {
  const mutations = [
    value => { value.payment.payouts = undefined; },
    value => { value.payment.payouts.items.pop(); },
    value => { value.payment.payouts.items.push({ ...value.payment.payouts.items[0] }); },
    value => { value.payment.payouts.items[2].allocationId = 'guide'; },
    value => { value.payment.payouts.items[2].allocationId = 'foreign'; },
    value => { value.payment.payouts.items[1].status = 'PENDING'; },
    value => { value.payment.payouts.items[1].status = 'FAILED'; },
    value => { value.payment.payouts.items[1].amountMinor++; },
    value => { value.payment.payouts.items[1].currency = 'USD'; },
    value => { value.payment.status = 'CAPTURE_PENDING'; value.payment.captureId = null; },
  ];
  for (const mutate of mutations) {
    const value = agreement(); mutate(value);
    assert.equal(step(value, 'payouts').complete, false);
    assert.doesNotMatch(getExecutionMessage(value), /all three supplier payments are confirmed/);
  }
});

test('voided evidence does not show a capture or supplier payout completion', () => {
  const value = agreement('VOIDED');
  value.evaluation.eligible = false;
  value.payment.captureId = null;
  value.payment.status = 'VOIDED';
  assert.match(getExecutionMessage(value), /There was no charge to refund/);
  assert.equal(step(value, 'evidence').failed, true);
  assert.equal(step(value, 'capture').complete, false);
  assert.equal(step(value, 'payouts').complete, false);
});

test('refunds retain the historical capture without presenting the agreement as settled', () => {
  for (const status of ['REFUNDED', 'PARTIALLY_REFUNDED']) {
    const value = agreement(status);
    value.payment.status = status;
    assert.equal(step(value, 'capture').complete, true);
    assert.equal(step(value, 'capture').title, 'Historical capture');
    assert.match(step(value, 'capture').detail, /refunded/);
    assert.equal(step(value, 'payouts').complete, false);
    assert.equal(step(value, 'payouts').active, false);
    assert.match(getExecutionMessage(value), /refunded/);
    assert.doesNotMatch(getExecutionMessage(value), /all three supplier payments are confirmed/);
  }
});

test('missing provider evidence and an empty mission do not imply confirmed money movement', () => {
  const value = agreement('CAPTURED');
  value.payment.status = 'PENDING';
  assert.equal(step(value, 'capture').complete, false);
  assert.match(getExecutionMessage(value), /confirmation needs review/);
  assert.equal(step(null, 'agreement').active, true);
  assert.ok(getPaymentSteps(null).every(item => !item.complete));
  assert.match(getExecutionMessage(null), /not confirmed/);
});
