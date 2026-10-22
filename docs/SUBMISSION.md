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

The repository includes a reproducible local mode without accounts, alongside PayPal Sandbox, Google Gemini, Anthropic and AEMET adapters. Actual PayPal Sandbox buyer approval, authorization, a €1,480 capture, three separate supplier Payouts and a cloudy-condition void were verified privately on October 22, 2026. A further approved mandate completed capture and all three Payouts autonomously. The public demonstration uses deterministic agents, labeled weather fixtures and simulated payment transitions. Complete model negotiation, live weather and webhook delivery remain unverified.

## How we built it

React and Vite power the interface. AG Grid Community provides the operations table. A Node.js 24 HTTP service owns agreement transitions and SQLite persistence. Autopilot persists a scheduled job before acknowledging it, then evaluates and settles without further browser commands. The payment adapter separates order creation, buyer approval, authorization, evidence-gated capture or void, reconciliation and supplier payouts. Optional Gemini and Anthropic adapters supply model-generated negotiation proposals without giving the model direct authority to settle money. An optional AEMET adapter retrieves observations and refuses to treat missing astronomical evidence as clear skies.

The public demo runs on a free Render web service in Frankfurt. Hosted clear and cloudy Autopilot flows and receipt integrity were verified on October 22, 2026, Canary Islands time. The repository also prepares an optional paid persistent-storage template and an optional Kernel browser-session adapter for a server-configured supplier destination. Signed guest sessions scope agreements and receipts to a browser session; public-demo mode blocks Sandbox payments and Kernel launches. Free hosting has ephemeral storage and cold starts. We do not claim Render Workflows execution. APIMatic is a development context workflow; Astropods, Elastic and Channel3 remain future integrations unless separately implemented and evidenced.

## Challenges

The hard part is preserving distinctions that a chat interface can hide: a forecast is not an observation; an authorization is not a captured payment; a capture is not three successful supplier transfers; and an agent's recommendation is not permission to spend. We made these boundaries visible in the agreement state and demonstration.

## Accomplishments we can demonstrate

- A complete intent-to-agreement-to-policy-to-payment simulation.
- An actual AG Grid interface for inspecting operational data.
- Persistent agreements and audit events in SQLite.
- Autonomous server execution after a single approved mandate, including recovery after a restart when the database survives.
- A successful-condition path and a failed-condition path that blocks capture.
- Separate adapters for optional external services, with no credentials required for the default demo.
- Actual private PayPal Sandbox authorization, conditional capture and three individually successful Payouts, plus a separate failed-condition authorization void; provider statuses verified through authenticated API queries.
- An additional approved Sandbox mandate completed capture and three supplier payments autonomously after arming.

The [sanitized PayPal evidence](evidence/paypal-sandbox.json) separates actual provider results from simulated agents and weather. A complete model negotiation and webhook delivery require their own verification before adding them to the video.

## What we learned

Useful agent autonomy requires an explicit mandate and a deterministic boundary around financial side effects. The quality of an agentic payment product is also visible in the transactions it refuses to execute.

## What's next

Complete model and oracle verification, then pilot with an actual operator and permitted site. Add authenticated operator access, durable orchestration and complete location-specific evidence. Deploy supplier agents independently and expand to other coordinated purchases with measurable fulfillment conditions.

## Built with

Node.js 24, React, Vite, SQLite, AG Grid Community. Optional implemented adapters: PayPal Sandbox REST APIs, Gemini generateContent, Anthropic Messages API, AEMET OpenData, Kernel browser sessions. Deployment configuration: Render Blueprint. Do not list planned integrations as technologies used.

## Evidence to add before submission

- Public repository: https://github.com/Enrickq/asterion-commerce; deployed application commit: `20606056ba21d0d4644516842021106508cd61a1`.
- Public demo: https://asterion-mj13.onrender.com/; hosted flows verified, see [record](VERIFICATION.es.md).
- Video URL and final runtime: **pending**.
- Actual PayPal Sandbox authorization/capture/void and three individual Payouts: **verified**, [sanitized record](evidence/paypal-sandbox.json). Autonomous clear and cloudy Sandbox outcomes: **verified**. Webhook delivery: **pending**.
- Actual model inference: **partially verified**, [two isolated Gemini guide quotes](evidence/gemini-verification.json). Complete three-supplier AI negotiation: **pending**.
- Completed sponsor integrations and proof of meaningful use: **pending**.
- Final eligibility, submission requirements, prize compatibility and deadline timezone checked against the current [official event page](https://paypalaihackathon.devpost.com/): **pending**.

The [PayPal announcement](https://developer.paypal.com/community/blog/PayPal_AI_Hackathon/) states that submissions close November 12, 2026. Do not infer the submission platform's cutoff hour or timezone from that date alone.
