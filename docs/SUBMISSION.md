# Devpost submission draft

This is copy for review, not a submitted entry. Replace all evidence placeholders with verified links before publishing. Do not claim an unperformed cloud deployment, external API run, model call or sponsor integration.

## Project name

ASTERION — Intent. Evidence. Payment.

## Elevator pitch

Agents should buy outcomes under a mandate. ASTERION negotiates a complete experience, checks evidence against the customer's approved conditions, and captures or voids a payment authorization accordingly.

## Inspiration

Complex purchases fail between discovery and delivery. The customer must coordinate suppliers, understand cancellation policies and pay before knowing whether the experience can happen. We asked what commerce looks like when agents can negotiate the whole outcome while their authority to spend remains explicit and inspectable.

Our first story is a private stargazing experience in La Palma: a guide, portable telescope and transport coordinated around a permitted observation site near Roque de los Muchachos. The customer approves the bundle and conditions. Weather evidence then determines whether the application may complete the payment.

## What it does

The buyer's mandate becomes a negotiated agreement. Supplier offers and allocations appear in an AG Grid operations view. A deterministic policy evaluates evidence and drives separate authorization, capture and void stages. An audit receipt explains the decision and distinguishes local demo events from payment-provider responses. Supplier disbursements follow capture as separate operations.

The repository includes a reproducible local mode without accounts, alongside configurable PayPal Sandbox, Anthropic and AEMET adapters. The default demonstration uses deterministic agents, labeled weather fixtures and simulated payment transitions. External runs require credentials and must be verified independently before being represented in the submission video.

## How we built it

React and Vite power the interface. AG Grid Community provides the operations table. A Node.js 24 HTTP service owns agreement transitions and SQLite persistence. The payment adapter separates order creation, buyer approval, authorization, evidence-gated capture or void, reconciliation and supplier payouts. An optional Anthropic adapter supplies model-generated negotiation proposals without giving the model direct authority to settle money. An optional AEMET adapter retrieves observations and refuses to treat missing astronomical evidence as clear skies.

The repository also prepares a free Render public-demo deployment, an optional paid persistent-storage template, and an optional Kernel browser-session adapter for a server-configured supplier destination. Neither configuration proves a completed cloud run. Signed guest sessions scope agreements and receipts to a browser session; public-demo mode blocks Sandbox payments and Kernel launches. The free hosting option has ephemeral storage and cold starts. We do not claim Render Workflows execution. APIMatic is a development context workflow; Astropods, Elastic and Channel3 remain future integrations unless separately implemented and evidenced.

## Challenges

The hard part is preserving distinctions that a chat interface can hide: a forecast is not an observation; an authorization is not a captured payment; a capture is not three successful supplier transfers; and an agent's recommendation is not permission to spend. We made these boundaries visible in the agreement state and demonstration.

## Accomplishments we can demonstrate locally

- A complete intent-to-agreement-to-policy-to-payment simulation.
- An actual AG Grid interface for inspecting operational data.
- Persistent agreements and audit events in SQLite.
- A successful-condition path and a failed-condition path that blocks capture.
- Separate adapters for optional external services, with no credentials required for the default demo.

Only retain claims that pass the repository's current tests and manual walkthrough. Add provider transaction evidence after external verification.

## What we learned

Useful agent autonomy requires an explicit mandate and a deterministic boundary around financial side effects. The quality of an agentic payment product is also visible in the transactions it refuses to execute.

## What's next

Verify the PayPal Sandbox and model flows end to end, then pilot with an actual operator and permitted site. Add authenticated operator access, durable orchestration and complete location-specific evidence. Deploy supplier agents independently and expand to other coordinated purchases with measurable fulfillment conditions.

## Built with

Node.js 24, React, Vite, SQLite, AG Grid Community. Optional implemented adapters: PayPal Sandbox REST APIs, Anthropic Messages API, AEMET OpenData, Kernel browser sessions. Deployment configuration: Render Blueprint. Do not list planned integrations as technologies used.

## Evidence to add before submission

- Public repository URL and commit hash: **pending**.
- Public demo URL, checked after deployment: **pending**.
- Video URL and final runtime: **pending**.
- Actual PayPal Sandbox authorization/capture/void evidence: **pending**.
- Actual model run, if entering as model-based AI rather than deterministic agent simulation: **pending**.
- Completed sponsor integrations and proof of meaningful use: **pending**.
- Final eligibility, submission requirements, prize compatibility and deadline timezone checked against the current [official event page](https://paypalaihackathon.devpost.com/): **pending**.

The [PayPal announcement](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/) states that submissions close November 12, 2026. Do not infer the submission platform's cutoff hour or timezone from that date alone.
