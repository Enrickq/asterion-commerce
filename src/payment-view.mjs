const SUPPLIER_IDS = ['guide', 'telescope', 'transport'];
const CAPTURED_STATES = new Set(['CAPTURED', 'PAYOUTS_PENDING', 'SETTLED']);
const REFUND_STATES = new Set(['REFUNDED', 'PARTIALLY_REFUNDED']);

function captureConfirmed(agreement) {
  const payment = agreement?.payment;
  if (!payment?.captureId) return false;
  if (REFUND_STATES.has(agreement?.status)) return true;
  return CAPTURED_STATES.has(agreement?.status)
    && (payment.status === 'COMPLETED' || payment.captureStatus === 'COMPLETED' || payment.captureResponse?.status === 'COMPLETED');
}

function supplierPaymentsConfirmed(agreement) {
  if (agreement?.status !== 'SETTLED' || !captureConfirmed(agreement)) return false;
  const payouts = agreement.payment?.payouts;
  const items = Array.isArray(payouts) ? payouts : payouts?.items;
  if (!Array.isArray(items) || items.length !== SUPPLIER_IDS.length) return false;
  const ids = new Set();
  for (const item of items) {
    if (!SUPPLIER_IDS.includes(item?.allocationId) || ids.has(item.allocationId) || item.status !== 'SUCCESS') return false;
    ids.add(item.allocationId);
    const allocation = agreement.allocations?.find(value => value.id === item.allocationId);
    if (allocation && (!Number.isSafeInteger(item.amountMinor) || item.amountMinor !== allocation.amountMinor)) return false;
    if (item.currency !== undefined && item.currency !== (agreement.currency || 'EUR')) return false;
  }
  return ids.size === SUPPLIER_IDS.length;
}

/** Presentation only. The server and provider remain authoritative for money. */
export function getExecutionMessage(agreement) {
  switch (agreement?.status) {
    case 'VOIDED': return 'Authorization voided. There was no charge to refund.';
    case 'VOID_PENDING': return 'Authorization void is not confirmed yet. Capture remains blocked; reconcile the payment state.';
    case 'CAPTURE_FAILED': return 'Capture was declined. No supplier payments are unlocked.';
    case 'CAPTURE_PENDING': return 'Capture is awaiting confirmation. Do not submit another charge; reconcile the payment state.';
    case 'CAPTURED': return captureConfirmed(agreement)
      ? 'Capture confirmed. Supplier payments are separate and have not all been confirmed.'
      : 'Capture confirmation needs review. Reconcile the payment state before proceeding.';
    case 'PAYOUTS_PENDING': return captureConfirmed(agreement)
      ? 'Capture confirmed. Supplier payments are still pending.'
      : 'Payment confirmation needs review. Supplier settlement is not confirmed.';
    case 'SETTLED': return supplierPaymentsConfirmed(agreement)
      ? 'Capture and all three supplier payments are confirmed.'
      : 'Supplier settlement evidence is incomplete. Reconcile before treating the agreement as settled.';
    case 'REFUNDED': return 'The capture was refunded. Supplier transfers are separate and require reconciliation.';
    case 'PARTIALLY_REFUNDED': return 'The capture was partially refunded. Review the remaining balance and separate supplier transfers.';
    default: return 'The payment outcome is not confirmed. Review the agreement and reconcile its payment state.';
  }
}

export function getPaymentSteps(agreement) {
  const status = agreement?.status;
  const authorized = Boolean(agreement?.payment?.authorizationId);
  const captured = captureConfirmed(agreement);
  const distributed = supplierPaymentsConfirmed(agreement);
  const refunded = REFUND_STATES.has(status);
  const voided = status === 'VOIDED' || status === 'VOID_PENDING';
  const evaluated = Boolean(agreement?.evaluation);
  const evidencePassed = agreement?.evaluation?.eligible === true;
  const capturePending = status === 'CAPTURE_PENDING';
  let captureDetail = 'A separate confirmation from the payment provider';
  if (status === 'CAPTURE_FAILED') captureDetail = 'Declined. Supplier payments remain blocked.';
  else if (capturePending) captureDetail = 'Awaiting provider confirmation. Reconcile; do not charge again.';
  else if (status === 'VOID_PENDING') captureDetail = 'Capture blocked while authorization void is unconfirmed.';
  else if (status === 'VOIDED') captureDetail = 'No capture was made.';
  else if (status === 'REFUNDED') captureDetail = 'Historical capture · fully refunded';
  else if (status === 'PARTIALLY_REFUNDED') captureDetail = 'Historical capture · partially refunded';
  else if (captured) captureDetail = agreement.payment.captureId;

  let payoutDetail = 'Three separate transfers after a confirmed capture';
  if (distributed) payoutDetail = 'Guide, telescope and transport each confirmed SUCCESS';
  else if (refunded) payoutDetail = 'Review supplier transfers separately from the customer refund.';
  else if (status === 'SETTLED') payoutDetail = 'Complete supplier evidence is missing. Reconciliation required.';
  else if (status === 'PAYOUTS_PENDING') payoutDetail = 'Waiting for every supplier transfer to be confirmed';
  else if (voided || status === 'CAPTURE_FAILED') payoutDetail = 'Blocked. No confirmed capture to distribute.';
  return [
    { id: 'agreement', title: 'Negotiate an agreement', detail: agreement ? 'Services, price and conditions recorded' : 'Services and terms fit together', complete: Boolean(agreement), active: !agreement, failed: false },
    { id: 'authorization', title: 'Buyer approves with PayPal', detail: authorized ? agreement.payment.authorizationId : 'The exact amount and approved agreement', complete: authorized, active: Boolean(agreement) && !authorized, failed: false },
    { id: 'evidence', title: 'Check the approved evidence', detail: voided ? 'Conditions failed. Capture remains blocked.' : evidencePassed ? 'Evidence passed at the recorded decision time' : evaluated ? 'Conditions did not pass the approved policy.' : 'Fresh, complete and within the approved limits', complete: evidencePassed, active: authorized && !evaluated && !voided && !refunded, failed: evaluated && !evidencePassed },
    { id: 'capture', title: refunded ? 'Historical capture' : 'Confirm the capture', detail: captureDetail, complete: captured, active: capturePending || (evidencePassed && !captured && !voided && status !== 'CAPTURE_FAILED'), failed: status === 'CAPTURE_FAILED' },
    { id: 'payouts', title: 'Confirm supplier payments', detail: payoutDetail, complete: distributed, active: !distributed && !refunded && (captured || status === 'SETTLED'), failed: false },
  ];
}
