import { ArrowRight, ArrowUpRight, Check, FileJson, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';
import settlement from '../docs/evidence/ai-sandbox-run.json';
import model from '../docs/evidence/gemini-verification.json';
import baseline from '../docs/evidence/paypal-sandbox.json';
import recordedScreen from '../docs/assets/asterion-ai-sandbox-settled.png';
import { summarizeRecordedRun } from './evidence-summary.mjs';
import './EvidenceRoom.css';

const evidence = summarizeRecordedRun(settlement, model, baseline);
const names = { guide: 'Private astronomy guide', telescope: 'Telescope and operator', transport: 'Private transport', organizer: 'Organizer gross remainder' };
const eur = value => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value / 100);
const date = value => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Atlantic/Canary' }).format(new Date(value));
const source = file => `https://github.com/Enrickq/asterion-commerce/blob/main/docs/evidence/${file}`;

function SourceLink({ file, children }) {
  return <a href={source(file)} target="_blank" rel="noreferrer"><FileJson size={15} />{children}<ArrowUpRight size={14} /></a>;
}

export default function EvidenceRoom({ onStartDemo }) {
  const { run, negotiation, failedRun } = evidence;
  if (!evidence.consistent) return <section className="panel recorded-unavailable" role="alert"><h2>The published records need review.</h2><p>We cannot present this run as consistent until its source records agree.</p><ul>{evidence.issues.map(issue => <li key={issue}>{issue}</li>)}</ul><SourceLink file="ai-sandbox-run.json">Inspect the source record</SourceLink></section>;
  const stages = [
    { name: 'Customer mandate', value: eur(run.budgetMinor), detail: 'Approved spending ceiling' },
    { name: 'Gemini negotiation', value: eur(run.totalMinor), detail: `${negotiation.requests} actual supplier requests` },
    { name: 'PayPal capture', value: run.providerPayment.status, detail: 'Buyer-approved Sandbox order' },
    { name: 'Supplier Payouts', value: '3 SUCCESS', detail: 'Individually checked amounts and recipients' },
  ];
  return <div className="evidence-room">
    <section className="recorded-intro">
      <div className="recorded-eyebrow"><Fingerprint size={16} /> RECORDED PROVIDER EVIDENCE</div>
      <h2>An approved mandate.<br /><em>Executed and accounted for.</em></h2>
      <p>Three actual Gemini quotes became one agreement. That same agreement completed autonomous capture and three supplier payments through PayPal Sandbox.</p>
      <div className="recorded-disclosure"><LockKeyhole size={17} /><span>Recorded private run · test funds · simulated inventory and settlement weather</span></div>
      <div className="recorded-date">Verified {date(run.verifiedAt)} · Canary Islands time</div>
    </section>

    <ol className="recorded-flow" aria-label="Recorded agreement results">
      {stages.map(stage => <li key={stage.name}><span className="recorded-tick"><Check size={14} /></span><span>{stage.name}</span><strong>{stage.value}</strong><small>{stage.detail}</small></li>)}
    </ol>

    <section className="recorded-ledger">
      <div className="recorded-section-title"><h3>Every allocation reconciles</h3><span>{eur(run.totalMinor)} total</span></div>
      <div className="recorded-table-scroll"><table><caption>Allocations and recorded Sandbox disbursements for the same agreement</caption><thead><tr><th scope="col">Service</th><th scope="col">Agreed amount</th><th scope="col">Recorded result</th></tr></thead><tbody>
        {run.allocations.map(allocation => <tr key={allocation.id}><th scope="row">{names[allocation.id] || allocation.id}</th><td>{eur(allocation.amountMinor)}</td><td>{allocation.id === 'organizer' ? <span className="recorded-remainder">Retained before fees and taxes</span> : <span className="recorded-success"><Check size={13} /> SUCCESS</span>}</td></tr>)}
      </tbody></table></div>
      <p className="recorded-note">One organizer is the merchant. Supplier Payouts are separate subsequent operations from its available balance. They are not an atomic split of the capture.</p>
    </section>

    <details className="recorded-details"><summary><Fingerprint size={16} />Inspect the transaction references<span>Same agreement throughout</span></summary>
      <dl><div><dt>Agreement ID</dt><dd>{run.agreementId}</dd></div><div><dt>Agreement SHA-256</dt><dd>{run.agreementHash}</dd></div><div><dt>PayPal order</dt><dd>{run.orderId}</dd></div><div><dt>Authorization</dt><dd>{run.authorizationId}</dd></div><div><dt>Capture</dt><dd>{run.captureId}</dd></div><div><dt>Payout batch</dt><dd>{run.payouts.batchId}</dd></div><div><dt>Model</dt><dd>{negotiation.model}</dd></div><div><dt>Inference time in this run</dt><dd>{Math.round(negotiation.inferenceWallTimeMs / 1000)} seconds</dd></div></dl>
      <p className="recorded-note">The JSON records retain the historical software baseline and subsequent validation notes. They summarize private application runs and authenticated provider queries; they are not digitally signed attestations by PayPal or Google.</p>
      <div className="recorded-links"><SourceLink file="ai-sandbox-run.json">Payment record</SourceLink><SourceLink file="gemini-verification.json">Model request metadata</SourceLink></div>
    </details>

    {failedRun && <section className="recorded-failure"><div><ShieldCheck size={23} /><div className="recorded-eyebrow">SEPARATE FAILED-CONDITION RUN</div></div><h3>The condition failed. The buyer was not charged.</h3><p>A different approved agreement used a cloudy fixture. Autopilot voided its Sandbox authorization without capture or supplier payouts.</p><div className="recorded-failure-result"><strong>{failedRun.providerPayment.status}</strong><span>No capture ID. No Payouts.</span></div><p className="recorded-note">Verified {date(failedRun.verifiedAt)} · deterministic negotiation · fixture weather. This does not reverse the completed agreement above.</p><SourceLink file="paypal-sandbox.json">Inspect the separate cloudy run</SourceLink></section>}

    <section className="recorded-screen"><div><h3>The recorded application result</h3><p>Historical screenshot from the private Gemini and PayPal Sandbox run.</p></div><a href={recordedScreen} target="_blank" rel="noreferrer" aria-label="Open the full recorded Sandbox screenshot"><img src={recordedScreen} alt="Historical ASTERION screen showing the Gemini agreement settled through PayPal Sandbox and three successful supplier payments" loading="lazy" /><span>Open full screenshot <ArrowUpRight size={14} /></span></a></section>

    <section className="recorded-next"><div><h3>Try the reproducible walkthrough</h3><p>The public walkthrough uses deterministic agents, fixture weather and simulated payments. Its server still schedules and executes the approved mandate autonomously.</p></div><button className="button button-primary" onClick={onStartDemo}>Open mission control <ArrowRight size={16} /></button></section>
  </div>;
}
