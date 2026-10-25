# ASTERION

**Agents negotiate. Evidence unlocks payment.**

[![Verify ASTERION](https://github.com/Enrickq/asterion-commerce/actions/workflows/ci.yml/badge.svg)](https://github.com/Enrickq/asterion-commerce/actions/workflows/ci.yml) · [MIT license](LICENSE) · Node.js 24 / React / PayPal Sandbox

[Try the public demo](https://asterion-mj13.onrender.com/) · [Inspect recorded provider runs](https://asterion-mj13.onrender.com/#verified-runs) · [English pitch deck](docs/presentation/ASTERION-Pitch.en-2026-10-25.pptx) · [English video script](docs/DEMO.en.md)

ASTERION coordinates a complete stargazing experience in La Palma under one customer-approved mandate. Supplier agents propose a bundle; the application enforces the budget and evidence policy, then autonomously captures or voids an authorization. Supplier payments follow capture as separate operations.

The foundation model proposes. The customer approves. A deterministic policy owns financial execution.

![ASTERION public workspace](docs/assets/asterion-public.png)

## What you can verify

| Evidence | Demonstrated outcome | Scope |
| --- | --- | --- |
| [Public walkthrough](https://asterion-mj13.onrender.com/) | Server Autopilot completes both capture/distribution and failed-condition void paths | Deterministic agents, fixture weather, simulated payments |
| [Same-agreement Gemini → Sandbox run](docs/evidence/ai-sandbox-run.json) | Three actual model quotes produced a €1,650 agreement within €1,700; autonomous capture and three successful supplier Payouts of €425 / €620 / €425 | Recorded private Sandbox run; test funds, simulated inventory and settlement weather |
| [Separate cloudy run](docs/evidence/paypal-sandbox.json) | Authorization voided without capture or supplier Payouts | Different approved agreement; deterministic negotiation and fixture weather |
| [MET Norway preview](docs/evidence/weather-preview.json) | Actual model forecast retrieved by the public application with timestamps and attribution | Read-only planning view; does not authorize a charge |

The public **Verified runs** view makes the model/payment agreement linkage, transaction references, allocations and historical screenshot inspectable. Source records retain their dates, historical software baselines and verification methods. They are sanitized local summaries, not signed provider attestations. Complete local observations for settlement, actual bookings, webhook delivery and production-money use remain unverified.

## A quick route for reviewers

1. Open **Verified runs** to inspect the recorded Gemini/Sandbox outcome and its JSON sources.
2. In **Mission control**, keep the default two-person brief and €1,500 ceiling; negotiate the €1,480 demo bundle.
3. Review and approve the exact mandate, then simulate authorization.
4. Select clear skies and **Arm autonomous execution**. The server continues without another payment click.
5. Create a separate mission with the cloudy scenario; verify an authorization void without capture.
6. Export the receipt and run the [offline consistency verifier](docs/RECEIPTS.md):

```sh
pnpm verify:receipt path/to/asterion-receipt.json
```

The free Render service may need a cold start. Default local mode needs no accounts or keys. No real bookings or production funds are involved. The final demonstration video is still pending; the recording script is preparation material.

## Run locally

Requirements: Node.js **24 or newer** and pnpm **11**. Node's built-in SQLite module stores agreements and their audit history.

```powershell
pnpm install --frozen-lockfile
node scripts/preflight.mjs
pnpm dev
```

Open [localhost:5173](http://localhost:5173). The API listens on [localhost:8787](http://localhost:8787). Keep the terminal running.

The commands work on Windows, macOS and Linux. Default mode does not need an environment file. For optional adapters, copy `.env.example` to `.env` with `Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` in a POSIX shell; configure only the selected integrations.

```powershell
pnpm test
pnpm build
pnpm smoke
pnpm start
```

After a production build, the Node server serves the application and API from port 8787. The development frontend proxies API requests to the backend.

## What to try

1. Submit a mandate for a private La Palma stargazing experience within the displayed budget.
2. Review supplier offers and the negotiated bundle in the AG Grid operations table.
3. Accept the mandate and authorize payment. In demo mode these are local simulations; in PayPal Sandbox the buyer must approve through PayPal.
4. Select a clear-sky fixture and arm Autopilot. A job is saved in SQLite and scheduled three seconds later; watch the server evaluate, capture and disburse without another action.
5. Start a separate agreement with cloudy or stale evidence and arm it. The server voids the authorization without capture; inspect the audit receipt and job outcome.

The default two-person scenario trades 20 minutes of schedule flexibility for a €1,480 bundle within a €1,500 mandate. With fixed timing the €1,680 opening offer cannot fit that mandate. These are simulated commercial offers, not quotes from actual La Palma operators.

The Spanish [demo script](docs/DEMO.es.md) includes a 2 minute 50 second presentation and the boundary between fixtures and external services.

**Read forecast** in the evidence panel offers a separate MET Norway forecast for the Roque area. It does not alter the selected scenario or authorize payment. Forecast time, model update time and retrieval time are shown with attribution. See the [weather evidence contract](docs/WEATHER.md).

Autopilot is a real server scheduler, including in the simulated-payment demo. Jobs are persisted before the arm request returns and can resume after a process restart if the database survives. This does not make the free hosting filesystem durable. Manual controls remain available for diagnostics when an autonomous job is not active.

## Payment model

This prototype uses **one organizer merchant** for the customer transaction. PayPal authorization and capture are separate operations. Supplier disbursements are subsequent Payouts operations from the organizer's prefunded balance, or a visibly simulated ledger in demo mode. They are **not an atomic split of a checkout payment**.

An authorization is not an escrow service. Voiding an authorization is not refunding a captured payment, and the issuing provider controls when an authorization hold disappears. ASTERION evaluates an application policy; it does not install a smart contract inside PayPal. PayPal documents a 29-day authorization window and recommends capture within its initial three-day honor period; later capture is not guaranteed. See the [official authorize and capture guide](https://developer.paypal.com/docs/checkout/standard/customize/authorization/).

## Integrations and current scope

| Component | Repository status | External verification |
| --- | --- | --- |
| AG Grid Community | Real React operations grid | No cloud account required |
| Local agent negotiation | Reproducible deterministic execution | No foundation model used in default mode |
| PayPal | Sandbox-only order, authorization, capture/void and Payouts adapter | Actual capture, void and three individual Payouts verified; autonomous clear and cloudy outcomes verified; webhooks pending |
| Anthropic | Optional model adapter | Requires API key and explicit model choice |
| Google Gemini | Optional model adapter with three isolated supplier contexts | Complete private negotiation verified with `gemini-3.1-flash-lite`; [evidence](docs/evidence/gemini-verification.json) |
| AEMET | Optional observation adapter | Requires API key and station ID; incomplete evidence fails closed |
| Render | Free public demo deployed in Frankfurt | Hosted Autopilot clear/cloudy flows verified; [verification record](docs/VERIFICATION.es.md) |
| APIMatic | PayPal Context Plugin installed and used for implementation review | Development aid; [evidence](docs/APIMATIC-CONTEXT.md), no generated SDK or runtime integration claim |
| Kernel | Optional browser-session adapter | Requires credentials and server-configured destination; no booking claim |
| Astropods, Elastic, Channel3 | Planned extensions | Not active integrations |

The definitive implementation notes and account requirements are in [INTEGRATIONS](docs/INTEGRATIONS.md) and [ACCOUNTS.es](docs/ACCOUNTS.es.md). A planned integration does not qualify as a completed sponsor submission.

![Gemini agreement settled through private PayPal Sandbox](docs/assets/asterion-ai-sandbox-settled.png)

## Deployment

The [public demo](https://asterion-mj13.onrender.com/) runs on Render Free with auto-deploy disabled. Application commit `c4428e9` was deployed and verified publicly on October 25, 2026, Canary Islands time; its CI passed 142 tests, build, preflight and smoke, including offline receipt checks. Private Sandbox runs retain their historical application baseline. Verification records distinguish application revisions from documentation and CI updates.

[render.yaml](render.yaml) prepares a free public demo with `PUBLIC_DEMO=true`, simulated payments and SQLite under `/tmp/asterion`. Guest sessions use signed HttpOnly cookies; agreements and receipts are scoped to that browser's session. The server blocks PayPal Sandbox payments and Kernel launches in public-demo mode.

**The free hosted demo has ephemeral storage:** agreements and session signing keys can disappear on redeploy, restart or idle spin-down. A cold start can delay the first visit. Local SQLite persists under `DATA_DIR`; this does not make the free hosted filesystem persistent. See [Render free-service limits](https://render.com/docs/free).

[render.persistent.yaml](render.persistent.yaml) is an optional paid template with one `0.5c-512mb` service and a 1 GB persistent disk at `/var/data`. Applying it incurs compute and disk charges and requires separate budget approval. Neither file deploys resources by itself. Review [Render pricing](https://render.com/pricing) before selecting a paid option.

Sandbox testing belongs in a private environment with `PUBLIC_DEMO=false`. Guest sessions are not verified user identities or an operator authorization system. The [architecture notes](docs/ARCHITECTURE.md) describe the production work still required.

## Location and evidence

The story is set around Roque de los Muchachos, La Palma. Public telescope visits are offered during daylight; the nighttime experience must use a permitted nearby site and the operator's own equipment. The prototype does not imply an IAC partnership or access to research telescopes. See [IAC visits](https://iac.es/es/observatorios-de-canarias/observatorio-del-roque-de-los-muchachos/visitas) and [La Palma tourism guidance](https://visitlapalma.es/observacion-de-estrellas/la-palma/roque-de-los-muchachos/).

Weather thresholds are demo policy parameters, not a scientific guarantee of a perfect sky. Forecasts, local observations, freshness and availability have different meanings. Missing or stale evidence must not become a positive observation.

## Project notes

- [Architecture and trust boundaries](docs/ARCHITECTURE.md)
- [Changes and release history](CHANGELOG.md)
- [Offline receipt verifier](docs/RECEIPTS.md)
- [Integration matrix and configuration](docs/INTEGRATIONS.md)
- [APIMatic installation and review evidence](docs/APIMATIC-CONTEXT.md)
- [Spanish demo narration](docs/DEMO.es.md)
- [English video recording script](docs/DEMO.en.md)
- [Functional video shot list and editing plan](docs/VIDEO-RECORDING.en.md)
- [English narration and draft subtitles](docs/video/)
- [Editable English pitch deck](docs/presentation/ASTERION-Pitch.en-2026-10-25.pptx)
- [English pitch manuscript](docs/PITCH.en.md)
- [Delivery checklist, in Spanish](docs/DELIVERY.es.md)
- [Devpost submission draft](docs/SUBMISSION.md)
- [Accounts and user setup, in Spanish](docs/ACCOUNTS.es.md)
- [Public deployment verification](docs/VERIFICATION.es.md)

MIT licensed. Built as a hackathon prototype; no real-money or production readiness claim.
