# ASTERION: English pitch manuscript

**Purpose:** English slide text and speaker notes for a ten-slide jury presentation. This document is alternative presentation material. It does **not** modify the existing live deck and is **not** a finished visual presentation. The live deck could not be inspected because ArtifactSession returned a host-access error, so this manuscript does not claim a word-for-word translation of that inaccessible artifact.

**Current software verification:** application commit `c4428e9e1342ad4ad64b6198a7233da6ccebaf2a`, with **142 automated tests** and public verification recorded in [the verification record](VERIFICATION.es.md). Private PayPal/Gemini verification took place on October 22–23 and retains its historical software baseline in the provider records. A separate public forecast preview was verified on October 25, 2026, Canary Islands time.

The public demo uses deterministic negotiation, fixture weather and simulated payments. The separately verified private run used actual Gemini API requests and actual PayPal **Sandbox APIs with test funds**. Inventory, weather and booking availability remained simulated in that private run.

## Slide 1: ASTERION

### On-screen text

**ASTERION**

**Intent. Evidence. Payment.**

Agents coordinate a complete experience and execute payment within a customer-approved mandate.

First use case: private stargazing in La Palma, Canary Islands.

### Speaker notes

“Book an extraordinary night under the stars. Coordinate the guide, telescope and transport. Stay within my budget, and complete payment only when the evidence satisfies the conditions I approve.”

That request is ASTERION's starting point. The product combines agent proposals with an explicit financial mandate and an inspectable execution policy. We have verified a private three-supplier Gemini negotiation followed by autonomous PayPal Sandbox settlement of the same agreement. Sandbox uses fictitious funds. We have also verified a separate cloudy-condition authorization void.

The public application provides a reproducible demonstration with simulated payments. We keep these environments visible because a credible financial agent must make its authority and evidence clear.

Sources: [integrated AI and Sandbox evidence](evidence/ai-sandbox-run.json), [baseline PayPal outcomes](evidence/paypal-sandbox.json), [public verification](VERIFICATION.es.md), [official hackathon announcement](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/).

## Slide 2: The mandate as the unit of commerce

### On-screen text

**The customer specifies the outcome. Agents coordinate its components.**

Today's complex purchase requires the customer to reconcile offers, schedules and cancellation conditions.

ASTERION produces one approved agreement with a spending ceiling and an evidence policy.

**Autonomy ends at the boundary of the mandate.**

### Speaker notes

The customer wants an experience that can happen under acceptable conditions. Coordinating three separate suppliers creates work before checkout and uncertainty afterward. Our product thesis is that agents can negotiate the components while an application enforces one common mandate.

This changes the interaction from selecting individual line items to approving a proposed outcome. The user still approves the agreement and the PayPal order. The model cannot increase the budget, rewrite the approved conditions or invoke payment tools.

This is a product hypothesis, not a claim that every purchase should become autonomous. The first useful markets are coordinated purchases whose conditions can be expressed and verified.

Source: [architecture and trust boundaries](ARCHITECTURE.md).

## Slide 3: A verified La Palma agreement

### On-screen text

**Customer ceiling: €1,700**

**Gemini-negotiated agreement: €1,650**

Two guests with 20 minutes of scheduling flexibility.

| Allocation | Amount |
| --- | ---: |
| Private astronomy guide | €425 |
| Telescope and observation equipment | €620 |
| Private transport | €425 |
| Organizer coordination | €180 |
| **Total** | **€1,650** |

Actual model requests. Simulated supplier inventory and weather.

### Speaker notes

On October 23, Canary Islands time, three isolated `gemini-3.1-flash-lite` supplier requests returned valid quotes. The backend validated whole-cent amounts against each supplier's limits and persisted this €1,650 agreement within the €1,700 mandate. Inference took about 55 seconds in that run.

These prices came from a simulated service catalog. They are not quotations from actual La Palma operators. The €180 organizer allocation is a gross remainder before fees, taxes and other costs, not demonstrated profit.

The proposed nighttime experience would use a permitted nearby observation site and a provider's own equipment. Public visits to the observatory's research telescopes take place during the day. We do not imply an IAC partnership, nighttime access to scientific telescopes or a completed reservation.

Sources: [Gemini request metadata and allocations](evidence/gemini-verification.json), [same-agreement settlement evidence](evidence/ai-sandbox-run.json), [IAC visitor guidance](https://iac.es/es/observatorios-de-canarias/observatorio-del-roque-de-los-muchachos/visitas).

## Slide 4: Architecture and financial authority

### On-screen text

**Models propose. The application controls execution.**

| Layer | Responsibility |
| --- | --- |
| Buyer and supplier agents | Propose a bundle within validated limits |
| Versioned agreement | Bind price, allocations and policy to the approved hash |
| Evidence policy | Check completeness, freshness and thresholds |
| Payment engine | Authorize, capture or void, then reconcile provider state |
| SQLite and Autopilot | Persist operations and resume eligible work |

React and AG Grid present the state. Node.js owns the transitions.

### Speaker notes

The current application runs one Node.js 24 process with SQLite. React and Vite power the interface. AG Grid Community exposes supplier allocations and operational states.

In the Gemini path, each supplier receives a separate context containing its own price limits. Its only declared function is `quote`. Returned arguments are data that the backend validates. The model receives no payment tools, provider credentials or authority to reserve real inventory.

After buyer approval and authorization, arming Autopilot persists a job before acknowledging it. A server worker evaluates evidence and follows the capture or void path without another financial command from the browser. The application saves operation identifiers before provider requests and treats uncertain results as unresolved until reconciliation. This supports recovery when the database survives a restart.

The free public Render service uses ephemeral storage. Local restart recovery tests do not make that hosted filesystem durable. Scaling beyond one process requires transactional shared storage and durable work orchestration.

Sources: [architecture](ARCHITECTURE.md), [Gemini implementation and validation](INTEGRATIONS.md#optional-google-gemini-negotiation).

## Slide 5: Sponsor integrations with evidence

### On-screen text

| Technology | Concrete responsibility | Current evidence |
| --- | --- | --- |
| AG Grid Community | Supplier allocations and operational inspection | Running in the application |
| Render | Host the Node application and autonomous demo | Public service and flows verified |
| APIMatic Context Plugin | PayPal context for implementation review | Installed and consulted during development |
| Kernel | Open a server-configured supplier browser session | Implemented adapter, external run pending |
| Astropods | Independently deployed supplier agents | Proposed extension |
| Elastic / Channel3 | Search and expanded catalog capabilities | Proposed extensions |

### Speaker notes

We show the status of each integration because sponsor use must be meaningful and demonstrable. AG Grid Community is part of the working React interface. We do not claim AG Studio or Enterprise functionality.

Render hosts the free Frankfurt web service. Hosted clear and cloudy Autopilot flows and receipt integrity have been verified. This deployment is a web service, not Render Workflows usage.

APIMatic's PayPal Context Plugin was installed and consulted during implementation review, including uncertain capture responses and reconciliation. It is a development aid. This application uses direct PayPal REST calls and does not claim a generated APIMatic SDK or runtime payment processing by APIMatic.

Kernel has an implemented session adapter but no recorded external run. It does not currently scrape terms, reserve inventory or certify weather. Astropods, Elastic and Channel3 remain proposed extensions. Using or listing three sponsors does not itself establish eligibility for any sponsor award.

Sources: [integration matrix](INTEGRATIONS.md), [APIMatic evidence](APIMATIC-CONTEXT.md), [public deployment verification](VERIFICATION.es.md), [official partner announcement](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/).

## Slide 6: The 2:50 demonstration

### On-screen text

| Time | Visible action | What the audience should understand |
| --- | --- | --- |
| 0:00–0:43 | Intent and three supplier quotes | A €1,700 mandate produces a €1,650 agreement |
| 0:43–1:23 | Agreement consent and official Sandbox approval | The buyer grants explicit authority |
| 1:23–1:48 | Labeled clear-weather fixture and Autopilot | The server continues after arming |
| 1:48–2:10 | Completed capture and supplier payments | Each transfer has a verified status |
| 2:10–2:35 | Separate cloudy agreement | Failed conditions prevent capture |
| 2:35–2:50 | Receipt and next milestone | Every financial decision has an explanation |

PayPal Sandbox test funds. Weather and inventory remain simulated.

### Speaker notes

Follow the [full English recording script](DEMO.en.md). This is a recording plan, not a claim that a video has been completed.

Open with two guests, 20-minute flexibility and a €1,700 ceiling. Show the three validated Gemini quotes and the resulting €1,650 agreement. Show the mandate, its allocations and its evidence policy before showing buyer approval in the official PayPal Sandbox checkout.

Label the weather fixture. Arm the approved mandate and show the server's progress. The verified main agreement completed a €1,650 capture and three separate successful Payouts: €425, €620 and €425. The organizer allocation remains separate from those transfers.

Switch visibly to a **different** previously verified cloudy agreement. Its authorization was voided with no capture or supplier Payouts. Do not depict a completed capture being reversed by changing the main agreement's weather selector.

The verified Gemini run took about 55 seconds. Label any edited wait, historical footage or receipt inspection. A still image of a completed run is evidence of that run, not a recording of a fresh execution. Keep `PENDING` visible until the provider confirms success. Keep credentials and account-management pages out of frame.

Sources: [English recording script](DEMO.en.md), [integrated main agreement](evidence/ai-sandbox-run.json), [separate cloudy outcome](evidence/paypal-sandbox.json).

## Slide 7: The PayPal Edge

### On-screen text

**A customer-approved mandate controls when the server may complete payment.**

| Evidence decision | Financial action |
| --- | --- |
| Approved conditions satisfied | Capture the authorization, then request separate supplier Payouts |
| Conditions fail or evidence is insufficient | Void the authorization and record the reason |
| Provider result is uncertain | Keep the operation unresolved and reconcile |

One organizer sells the bundle. Supplier payments are subsequent operations.

### Speaker notes

Our product contribution connects an approved agreement, evidence and a traceable execution decision. PayPal already provides the underlying authorization and capture capabilities.

The adapter creates one Orders v2 purchase unit with `intent: AUTHORIZE`. After official buyer approval, it authorizes the order. Payments v2 then captures or voids the resulting authorization. The implementation retains order, authorization and capture identifiers separately.

An authorization is subject to PayPal and funding-source rules. PayPal documents a 29-day authorization window and recommends capture within its initial three-day honor period. Capture remains subject to risk and availability. ASTERION does not provide escrow or install a smart contract inside PayPal. Voiding an authorization is different from refunding a captured payment.

Payouts uses the organizer's available balance and requires the relevant PayPal access. Capture and supplier disbursements are not an atomic split. The application checks each supplier item's amount, currency, references and status. It does not relabel a pending batch as completed. Webhook handling exists, but actual webhook delivery remains unverified.

Sources: [PayPal authorization guidance](https://developer.paypal.com/docs/checkout/standard/customize/authorization/), [Orders v2](https://developer.paypal.com/api/orders/v2), [Payouts overview](https://developer.paypal.com/docs/payouts/standard/), [webhook documentation](https://developer.paypal.com/api/rest/webhooks/), [implementation and reconciliation](INTEGRATIONS.md#paypal-sandbox-validation).

## Slide 8: What the prototype proves

### On-screen text

**142 automated tests at the deployed application revision**

**Actual private provider run:** three Gemini quotes, buyer-approved PayPal Sandbox authorization, autonomous capture and three successful supplier Payouts.

**Separate failed-condition run:** authorization voided without capture.

**Public demo:** hosted on Render with deterministic agents, fixture weather and simulated payments.

**Read-only MET Norway forecast:** externally verified. Complete local observations for settlement, real bookings, webhook delivery and production payments remain unverified.

### Speaker notes

The deployed application revision is commit `c4428e9e1342ad4ad64b6198a7233da6ccebaf2a`. Its verification record reports 142 automated tests, preflight, a frontend build and system smoke checks locally and in CI, including offline receipt verification. Public clear and cloudy Autopilot flows were checked on this revision. The historical private model and payment runs retain their own baselines; they are not represented as new transactions performed by this release.

Automated connector tests use mocks. Real-provider claims come from separate private runs followed by authenticated provider queries. The sanitized records retain transaction references and status metadata without credentials. They are local evidence summaries, not digitally signed attestations by PayPal or Google.

The integrated agreement completed three real Gemini quote requests and subsequently settled through PayPal Sandbox using fictitious funds. The separate cloudy agreement demonstrates an authorization void. Both weather scenarios used fixtures. Earlier Gemini errors stopped without creating an agreement or payment, and the successful run does not imply guaranteed model availability.

The public demo is available at [asterion-mj13.onrender.com](https://asterion-mj13.onrender.com/). Its free service has cold starts and ephemeral SQLite/session storage. It blocks Sandbox payments and Kernel launches for public visitors.

The separate **Read forecast** view retrieves a MET Norway model forecast with attribution, original model update time and forecast validity. It does not change an agreement or authorize capture. New policy checks reject renamed duplicate sources and incomplete or non-local actual observations. Declared source lineage is not a field-validated proof of independence.

Sources: [verification record and CI reference](VERIFICATION.es.md), [integrated provider evidence](evidence/ai-sandbox-run.json), [Gemini request metadata](evidence/gemini-verification.json), [baseline PayPal outcomes](evidence/paypal-sandbox.json), [public repository](https://github.com/Enrickq/asterion-commerce).

## Slide 9: The first customer is the organizer

### On-screen text

**Proposed pilot**

One experience operator coordinates three suppliers across twenty supervised reservations.

**Illustrative pricing hypothesis**

€149 per month plus 1% of a settled reservation.

Validate willingness to pay, coordination time and payment disputes per reservation.

**Advantage to build:** sector policies, supplier integrations and a useful history of evidence decisions.

### Speaker notes

This is a commercial proposal, not traction. We have not established a paying customer, a live booking pilot or product revenue. The operator would buy the software and remain the merchant for the coordinated experience.

Twenty supervised reservations is an initial pilot design. The proposed €149 monthly fee and 1% settlement fee are illustrative pricing hypotheses to test through customer interviews and an authorized pilot. They are separate from the €180 organizer coordination allocation in the demonstration. They do not represent validated unit economics, margin or a charge currently implemented in the application.

The pilot should establish whether the operator saves coordination time and whether customers understand conditional authorization. It should also record cancellations, blocked captures and disputes. A useful advantage would emerge from trusted supplier integrations, accepted sector policies and evidence that explains settlement decisions. Access to a foundation model alone does not establish that advantage.

Context: [current prototype scope and next steps](SUBMISSION.md#whats-next), [architecture requirements before financial use](ARCHITECTURE.md#work-required-before-public-financial-use). Pilot size and pricing are explicitly proposed assumptions.

## Slide 10: A global platform built through verified stages

### On-screen text

| Stage | Evidence required to advance |
| --- | --- |
| Verified prototype | Reproducible public demo and private AI/Sandbox outcomes |
| Field-ready pilot | Actual operator, permitted site and complete location-specific evidence |
| Commercial operation | Verified identities, operator permissions, durable storage and provider approvals |
| B2C expansion | Coordinated travel and events with explicit fulfillment conditions |
| B2B expansion | Multi-supplier purchases with independently verifiable milestones |

**Every complex purchase can have a mandate an agent can execute and explain.**

### Speaker notes

The prototype establishes a technical starting point. The next milestone is a real oracle and actual operator integration, followed by a supervised pilot at a permitted location. A station observation or municipality forecast cannot silently replace the complete evidence required for a specific observation site.

Commercial operation needs verified authentication, operator authorization, durable orchestration and storage, an appropriate merchant arrangement, PayPal approvals where required and support for disputes and recovery. The current single-process SQLite deployment is not a high-availability architecture.

The reusable component is the mandate and policy boundary. Other purchases need their own evidence and contractual conditions. Coordinated travel, events and B2B delivery milestones are expansion hypotheses, not existing customers or integrations.

The hackathon requires meaningful use of PayPal and AI. Submission materials need English or an English translation. The current delivery checklist records a cutoff of November 12, 2026 at 12:00 PST, or 20:00 Canary Islands time. Registration, personal eligibility and final submission still require completion. A final public YouTube demonstration under three minutes remains pending. This manuscript is English preparation material; it neither submits the project nor guarantees an award.

Sources: [current submission draft](SUBMISSION.md), [architecture and field requirements](ARCHITECTURE.md), [official hackathon rules](https://paypalaihackathon.devpost.com/rules), [official event announcement](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/).

## Handoff for the visual deck

Use the ten sections above as the English slide copy and presenter notes. Keep the allocation arithmetic and the public/private environment disclosures intact. Review text fit when applying this manuscript to the existing visual deck. The live deck itself remains unchanged, and its English visual layout has not been rendered or inspected by this work.
