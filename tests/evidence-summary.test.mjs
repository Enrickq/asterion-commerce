import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeRecordedRun } from '../src/evidence-summary.mjs';
const read = file => JSON.parse(readFileSync(new URL(`../docs/evidence/${file}`, import.meta.url), 'utf8'));
const originals = [read('ai-sandbox-run.json'), read('gemini-verification.json'), read('paypal-sandbox.json')];

test('published model and payment records describe the same recorded Sandbox agreement', () => {
  const result = summarizeRecordedRun(...originals);
  assert.equal(result.consistent, true);
  assert.equal(result.run.totalMinor, 165000);
  assert.equal(result.failedRun.agreementStatus, 'VOIDED');
  assert.notEqual(result.failedRun.agreementId, result.run.agreementId);
});

test('recorded evidence cannot display success for changed amounts, references or missing supplier payments', () => {
  for (const change of [
    ([s]) => { s.realMoney = true; },
    ([s]) => { s.weatherMode = 'live'; },
    ([, m]) => { m.completeSupplierNegotiationVerified = false; },
    ([s, m]) => { s.runs[0].budgetMinor = m.successfulNegotiation.budgetMinor = '170000'; },
    ([s, m]) => { s.runs[0].allocations[3].id = m.successfulNegotiation.allocations[3].id = 'unknown-beneficiary'; },
    ([, m]) => { m.successfulNegotiation.agreementHash = 'b'.repeat(64); },
    ([, m]) => { m.successfulNegotiation.allocations[0].amountMinor++; },
    ([s]) => { s.runs[0].providerPayment.captureId = 'FOREIGN'; },
    ([s]) => { s.runs[0].providerPayment.amountMinor++; },
    ([s]) => { s.runs[0].payouts.items.pop(); },
    ([s]) => { s.runs[0].payouts.items[1] = s.runs[0].payouts.items[0]; },
    ([s]) => { s.runs[0].payouts.items[0].configuredRecipientMatched = false; },
    ([s]) => { s.runs[0].payouts.items[0].status = 'PENDING'; },
    ([s]) => { s.runs[0].autopilot.outcome = 'PENDING'; },
  ]) {
    const records = structuredClone(originals); change(records);
    const result = summarizeRecordedRun(...records);
    assert.equal(result.consistent, false);
    assert.ok(result.issues.length > 0);
  }
});
