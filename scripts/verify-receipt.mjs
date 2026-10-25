import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hashObject, verifyEventChain } from '../server/core.mjs';
import { stableRequestId } from '../server/connectors/shared.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,200}$/.test(value);
const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const money = value => Number.isSafeInteger(value) && value > 0;
const date = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const successful = value => ['SUCCESS', 'SUCCEEDED', 'COMPLETED'].includes(value);
const retained = item => ['platform', 'platform-fee', 'fee', 'organizer'].includes(item.id)
  || ['platform', 'organizer'].includes(item.role) || ['platform', 'organizer'].includes(item.kind) || item.retained;
const scope = 'Offline consistency check only. This is not a PayPal/Google signature, provider authentication, proof of real funds, or certification of weather or fulfillment.';

/** Verify a complete core.receipt() export without network access or credentials. */
export function verifyReceipt(receipt) {
  const checks = [];
  const warnings = [scope];
  const check = (id, passed, detail) => checks.push({ id, passed: Boolean(passed), detail });
  const finish = summary => ({ valid: checks.every(item => item.passed), checks, warnings, summary, scope });
  check('receipt-format', object(receipt) && receipt.schemaVersion === 'asterion.receipt.v1',
    'Requires a complete ASTERION receipt export; sanitized evidence summaries are a different format.');
  if (!checks[0].passed) return finish(null);
  const agreement = receipt.agreement;
  const payment = receipt.payment;
  const events = receipt.events;
  check('required-sections', object(agreement) && object(payment) && object(receipt.integrity) && Array.isArray(events) && events.length > 0,
    'Agreement, payment, integrity metadata and the full event array must be present.');
  if (!checks.at(-1).passed) return finish(null);

  try {
    check('agreement-format', agreement.schemaVersion === 'asterion.agreement.v1' && identifier(agreement.id)
      && date(agreement.createdAt) && date(agreement.expiresAt) && date(receipt.exportedAt), 'Agreement identity and timestamps use the supported schema.');
    check('environment', ['demo', 'paypal-sandbox'].includes(receipt.environment)
      && agreement.paymentProvider === receipt.environment && payment.provider === receipt.environment,
    'Receipt, approved agreement and payment must identify the same supported environment.');
    check('agreement-hash', digest(receipt.agreementHash) && hashObject(agreement) === receipt.agreementHash,
      'Recompute SHA-256 over the canonical approved agreement terms.');
    const allocations = Array.isArray(agreement.allocations) ? agreement.allocations : [];
    const allocationIds = allocations.map(item => item?.id);
    const amountsValid = allocations.length > 0 && allocations.every(item => object(item) && identifier(item.id) && money(item.amountMinor));
    const total = amountsValid ? allocations.reduce((sum, item) => sum + item.amountMinor, 0) : NaN;
    check('approved-amounts', agreement.currency === 'EUR' && money(agreement.budgetMinor) && money(agreement.totalMinor)
      && agreement.totalMinor <= agreement.budgetMinor && Number.isSafeInteger(total) && total === agreement.totalMinor
      && new Set(allocationIds).size === allocations.length,
    'Positive integer EUR cents, unique allocation IDs, allocations equal the total, and total within budget.');

    const eventShape = events.every(event => object(event) && identifier(event.id) && typeof event.type === 'string'
      && /^[A-Z_]{1,80}$/.test(event.type) && date(event.at) && object(event.data) && digest(event.hash));
    check('event-format', eventShape && new Set(events.map(event => event?.id)).size === events.length,
      'Every event has a unique ID, timestamp, data and SHA-256 hash.');
    check('event-chain', eventShape && verifyEventChain(events), 'Recompute every event hash and its link to the preceding event.');
    check('event-count', Number.isSafeInteger(receipt.integrity.eventCount) && receipt.integrity.eventCount === events.length,
      'Declared event count must match the complete exported array.');
    check('last-event-hash', receipt.integrity.lastEventHash === events.at(-1)?.hash,
      'The declared final hash must match the final exported event.');
    check('stored-integrity-flags', receipt.integrity.agreementHashValid === true && receipt.integrity.eventChainValid === true,
      'Stored integrity flags must agree with a valid export; flags alone are never proof.');
    check('agreement-event-bindings', events[0]?.type === 'AGREEMENT_NEGOTIATED'
      && events[0]?.data?.agreementHash === receipt.agreementHash
      && events.every(event => event.data?.agreementHash === undefined || event.data.agreementHash === receipt.agreementHash)
      && events.every(event => event.data?.totalMinor === undefined || event.data.totalMinor === agreement.totalMinor),
    'Agreement hashes and approved totals recorded in events must match the exported terms.');

    const consent = receipt.consent;
    const hasFinancialActivity = Boolean(payment.orderId || payment.authorizationId || payment.captureId || payment.payouts);
    check('consent', consent === null ? !hasFinancialActivity : object(consent)
      && consent.agreementHash === receipt.agreementHash && consent.maxAmountMinor === agreement.totalMinor
      && consent.currency === agreement.currency && consent.provider === receipt.environment && date(consent.acceptedAt),
    'Financial activity requires consent to this exact agreement, amount, currency and environment.');
    if (consent) check('consent-event', events.some(event => event.type === 'CONSENT_RECORDED' && event.data?.agreementHash === receipt.agreementHash),
      'The complete event trail must contain the recorded approval.');

    check('payment-references', ['orderId', 'authorizationId', 'captureId'].every(key => payment[key] === null || identifier(payment[key]))
      && (!payment.authorizationId || Boolean(payment.orderId)) && (!payment.captureId || Boolean(payment.authorizationId)),
    'Payment references must be valid and retain order → authorization → capture dependencies.');
    for (const key of ['orderId', 'authorizationId', 'captureId']) {
      const bindings = events.filter(event => event.data?.[key] !== undefined && event.data[key] !== null);
      check(`event-${key}`, bindings.every(event => event.data[key] === payment[key]), 'Any event-bound payment reference must match the exported payment.');
      if (payment[key] && bindings.length === 0) warnings.push(`${key} is not directly bound in an event; this receipt format cannot independently establish its provider origin.`);
    }
    check('payment-amount-metadata', (payment.amountMinor === undefined || payment.amountMinor === agreement.totalMinor)
      && (payment.currency === undefined || payment.currency === agreement.currency), 'Any payment amount metadata must match the approved amount and currency.');
    if (payment.captureId && payment.amountMinor === undefined) warnings.push('The receipt records the approved capture amount, but its payment section does not contain a separate provider amount attestation.');

    const evaluation = receipt.evaluation;
    if (evaluation !== null) {
      check('evidence-binding', object(evaluation) && evaluation.agreementHash === receipt.agreementHash
        && evaluation.evidenceHash === (receipt.evidence === null ? null : hashObject(receipt.evidence))
        && typeof evaluation.eligible === 'boolean' && evaluation.decision === (evaluation.eligible ? 'PASS' : 'FAIL') && date(evaluation.evaluatedAt),
      'Evaluation must bind to the exported evidence and approved agreement with a consistent decision.');
    } else check('no-unrecorded-evidence', receipt.evidence === null, 'Evidence and evaluation must be exported together.');

    const settled = receipt.status === 'SETTLED';
    const captured = ['CAPTURED', 'PAYOUTS_PENDING', 'SETTLED'].includes(receipt.status);
    const refunded = ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(receipt.status);
    const voided = receipt.status === 'VOIDED' || payment.status === 'VOIDED';
    check('captured-state', !captured || (payment.status === 'COMPLETED' && Boolean(payment.captureId)
      && evaluation?.eligible === true && events.some(event => event.type === 'CAPTURE_REQUESTED' && event.data?.evidenceHash === evaluation.evidenceHash)),
    'A captured state requires a completed capture reference, passing evaluation and its capture-request event.');
    check('voided-state', !voided || (receipt.status === 'VOIDED' && payment.status === 'VOIDED' && Boolean(payment.authorizationId)
      && payment.captureId === null && payment.payouts === null), 'A voided authorization cannot also contain a capture or supplier payout.');
    check('completed-capture-state', payment.status !== 'COMPLETED' || captured,
      'A completed payment capture must agree with the agreement settlement state.');
    check('refund-state', !refunded || (payment.status === receipt.status && payment.captureStatus === receipt.status && Boolean(payment.captureId)
      && payment.refundReviewRequired === true && date(payment.refundObservedAt)
      && events.some(event => ['PAYMENT_RECONCILED', 'CAPTURE_REFUND_DETECTED'].includes(event.type) && event.data?.status === receipt.status)),
      'A refund keeps the historical capture, records its observed state and requires separate supplier reconciliation.');
    if (refunded) warnings.push('Customer capture refunded in whole or part. Existing supplier transfers are historical obligations requiring separate review, not proof of current net settlement.');

    const payouts = payment.payouts;
    if (payouts !== null) {
      const expected = new Map(allocations.filter(item => !retained(item)).map(item => [item.id, item]));
      const items = Array.isArray(payouts?.items) ? payouts.items : [];
      check('payout-prerequisite', object(payouts) && (captured || refunded) && identifier(payouts.batchId)
        && (payouts.provider === undefined || payouts.provider === receipt.environment), 'Payouts require a completed customer capture and a batch reference in the same environment.');
      check('payout-allocations', expected.size === 3 && items.length <= 3 && new Set(items.map(item => item?.allocationId)).size === items.length
        && items.every(item => object(item) && expected.has(item.allocationId)
          && item.amountMinor === expected.get(item.allocationId).amountMinor
          && (item.currency === undefined ? receipt.environment === 'demo' || !successful(item.status) : item.currency === agreement.currency)
          && item.senderItemId === stableRequestId('item', `${agreement.id}:${item.allocationId}`)
          && (!successful(item.status) || identifier(item.payoutItemId))),
      'Each payout must map once to an approved supplier, with matching cents, currency and sender reference.');
      const payoutIds = items.map(item => item?.payoutItemId).filter(Boolean);
      check('payout-references', new Set(payoutIds).size === payoutIds.length
        && events.every(event => {
          const eventPayouts = event.type.startsWith('PAYOUTS_') && event.data?.batchId ? event.data : event.data?.payouts;
          return !eventPayouts || eventPayouts.batchId === payouts.batchId;
        }), 'Payout item IDs must be unique and event-bound batches must match.');
      check('settled-items', !settled || (items.length === 3 && items.every(item => successful(item.status))),
        'SETTLED requires three individually successful supplier payout items.');
      if (receipt.environment === 'demo') warnings.push('Demo payout currency is inherited from the EUR agreement; no external transfers are proven.');
    } else check('settled-payouts', !settled, 'SETTLED requires the complete supplier payout record.');

    if (receipt.autopilot !== null) {
      const job = receipt.autopilot;
      check('autopilot-binding', object(job) && identifier(job.id) && job.agreementHash === receipt.agreementHash
        && events.some(event => event.type === 'AUTOPILOT_ARMED' && event.data?.jobId === job.id)
        && (job.status !== 'COMPLETED' || ((job.outcome === receipt.status || refunded && ['CAPTURED', 'PAYOUTS_PENDING', 'SETTLED'].includes(job.outcome)) && events.some(event => event.type === 'AUTOPILOT_COMPLETED'
          && event.data?.jobId === job.id && event.data?.outcome === job.outcome))),
      'Autopilot must reference the approved agreement and its recorded job outcome.');
    }
    warnings.push(receipt.environment === 'demo' ? 'DEMO: payments are simulated; valid hashes do not turn them into real transactions.'
      : 'PAYPAL SANDBOX: test accounts and test funds; provider statuses are not authenticated by this offline check.');
    return finish({ agreementId: identifier(agreement.id) ? agreement.id : null, environment: receipt.environment,
      status: receipt.status, currency: agreement.currency, totalMinor: agreement.totalMinor,
      eventCount: events.length, lastEventHash: events.at(-1)?.hash ?? null,
      references: Object.fromEntries(['orderId', 'authorizationId', 'captureId'].map(key => [key, identifier(payment[key]) ? payment[key] : null])) });
  } catch {
    check('serializable-structure', false, 'The receipt must contain a complete JSON-compatible structure with finite values.');
    return finish(null);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help' || args[0] === '-h') {
    console.log('Usage: node scripts/verify-receipt.mjs path/to/asterion-receipt.json\nOffline consistency verification. No credentials or network calls.');
    process.exitCode = args.length === 1 ? 0 : 2;
    return;
  }
  try {
    const path = resolve(args[0]);
    if ((await stat(path)).size > 32 * 1024 * 1024) throw new Error('Receipt too large');
    const report = verifyReceipt(JSON.parse(await readFile(path, 'utf8')));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.valid ? 0 : 1;
  } catch {
    console.error('Unable to read a valid JSON receipt (maximum 32 MiB). No verification completed.');
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
