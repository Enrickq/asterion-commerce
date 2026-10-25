const expectedSuppliers = ['guide', 'telescope', 'transport'];
const validMinor = value => Number.isSafeInteger(value) && value > 0;

// These are consistency checks over published records, not provider signatures
// or a new API verification. Keep that distinction visible in the product.
export function summarizeRecordedRun(settlement, model, baseline) {
  const run = settlement?.runs?.[0];
  const negotiation = model?.successfulNegotiation;
  const issues = [];
  const require = (condition, message) => { if (!condition) issues.push(message); };
  require(settlement?.environment === 'paypal-sandbox' && settlement.realMoney === false && settlement.weatherMode === 'fixtures' && settlement.agentMode === 'gemini' && model?.completeSupplierNegotiationVerified === true, 'The recorded environment must identify the complete Gemini negotiation, Sandbox test funds and fixture weather.');
  require(Boolean(run && negotiation), 'The negotiation or settlement record is missing.');
  if (run && negotiation) {
    require(run.agreementId === negotiation.agreementId && run.agreementHash === negotiation.agreementHash && /^[a-f0-9]{64}$/.test(run.agreementHash), 'The model and payment records do not identify the same agreement.');
    require(negotiation.requests === 3 && negotiation.allHttp200 === true, 'The complete three-supplier model run is not recorded.');
    require(validMinor(run.totalMinor) && validMinor(run.budgetMinor) && run.totalMinor <= run.budgetMinor && run.totalMinor === negotiation.totalMinor && run.budgetMinor === negotiation.budgetMinor && run.currency === 'EUR', 'The budget and agreement totals do not match.');
    const allocations = Array.isArray(run.allocations) ? run.allocations : [];
    require(allocations.length === 4 && new Set(allocations.map(item => item.id)).size === 4 && allocations.every(item => [...expectedSuppliers, 'organizer'].includes(item.id) && validMinor(item.amountMinor) && item.currency === 'EUR') && allocations.reduce((total, item) => total + item.amountMinor, 0) === run.totalMinor, 'Supplier allocations do not reconcile to the total.');
    const modelAllocations = Array.isArray(negotiation.allocations) ? negotiation.allocations : [];
    require(modelAllocations.length === allocations.length && allocations.every(item => modelAllocations.some(other => other.id === item.id && other.amountMinor === item.amountMinor && other.currency === item.currency)), 'The quoted and paid agreement allocations differ.');
    const capture = run.providerPayment;
    require(run.agreementStatus === 'SETTLED' && capture?.status === 'COMPLETED' && capture.amountMinor === run.totalMinor && capture.currency === run.currency && Boolean(run.captureId) && capture.captureId === run.captureId && capture.orderId === run.orderId && capture.authorizationId === run.authorizationId, 'The recorded capture is incomplete or has mismatched references.');
    const items = run.payouts?.items;
    require(Array.isArray(items) && items.length === 3 && new Set(items.map(item => item.payoutItemId)).size === 3 && expectedSuppliers.every(id => {
      const matches = items.filter(item => item.allocationId === id);
      const allocation = allocations.find(item => item.id === id);
      return matches.length === 1 && matches[0].status === 'SUCCESS' && Boolean(matches[0].payoutItemId) && matches[0].configuredRecipientMatched === true && matches[0].currency === 'EUR' && matches[0].amountMinor === allocation?.amountMinor;
    }), 'Three individually confirmed supplier payments are not recorded.');
    require(run.execution === 'autonomous' && run.autopilot?.status === 'COMPLETED' && run.autopilot?.outcome === 'SETTLED', 'Autonomous completion is not recorded.');
    require(Number.isFinite(Date.parse(run.verifiedAt)), 'The verification date is missing.');
  }
  const failedRun = baseline?.runs?.find(item => item.scenario === 'cloudy' && item.execution === 'autonomous' && item.agreementStatus === 'VOIDED' && item.providerPayment?.status === 'VOIDED' && item.captureId === null && !item.payouts && item.agreementId !== run?.agreementId);
  return { consistent: issues.length === 0, issues, run, negotiation, failedRun,
    scope: 'Consistency of recorded local summaries; not a fresh transaction or a signed provider attestation.' };
}
