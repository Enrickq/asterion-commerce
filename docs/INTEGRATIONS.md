# Integrations and evidence of use

Status vocabulary: **integrated** means real code is used locally; **configurable** means an adapter exists but still needs credentials and an external run; **prepared** means a configuration or documented workflow is present; **planned** means it is not implemented. Account creation is not evidence of runtime use.

| Service | Status | Actual responsibility | What remains |
| --- | --- | --- | --- |
| AG Grid Community | Integrated | React table for offers, supplier allocations and operational inspection | Review the actual UI before making AG Studio or Enterprise feature claims; neither is implied |
| Local negotiation | Integrated | Reproducible buyer/supplier negotiation under a mandate | This mode does not call a foundation model |
| PayPal Sandbox | Configurable | OAuth, order authorization, conditional capture/void and separate Payouts adapter | Configure test app and buyer, run both outcomes, verify provider records and webhook delivery |
| Anthropic | Configurable | Optional model-based negotiation through the Messages API | Key, billing access, explicit available model and end-to-end run |
| Google Gemini | Configurable, opt-in | Three independent supplier calls through Gemini `generateContent`, with a structured `quote` function and backend price validation | Server key, explicit available model ID, user verification of the project's Free Tier/quota and an end-to-end run |
| AEMET | Configurable | Fresh local observation retrieval through OpenData | Key and valid station ID; astronomical evidence completeness must still pass |
| Render | Prepared | Free public-demo Blueprint; optional paid persistent template | Connect repository, deploy and verify the chosen environment |
| APIMatic | Used in development | PayPal Context Plugin installed in Codex and consulted for implementation review | No generated SDK or runtime use claim; [evidence](APIMATIC-CONTEXT.md) |
| Kernel | Configurable | Open a real browser session at a server-configured supplier URL | Credentials and external verification; navigation, extraction and reservations are not implemented |
| Astropods | Planned | Hosting and lifecycle of independently deployed supplier agents | Package, publish, deploy and instrument actual agents |
| Elastic | Planned | Search over offers, policies and audit receipts | Add index, ingestion and a meaningful retrieval feature |
| Channel3 | Planned | Optional equipment discovery if physical products enter the flow | A catalog API must not be misrepresented as tour booking inventory |

## Configuration

Copy `.env.example` to `.env`. The startup commands load local configuration. Restart the server after changing modes. Default values are `PAYMENTS_MODE=demo`, `AGENT_MODE=deterministic` and `WEATHER_MODE=fixtures`.

| Variable | Purpose |
| --- | --- |
| `PORT`, `HOST` | HTTP binding; defaults 8787 and 127.0.0.1 |
| `DATA_DIR` | SQLite directory; hosted durability requires explicit persistent storage |
| `PUBLIC_BASE_URL` | Browser-reachable server origin for provider return URLs |
| `PUBLIC_DEMO` | `true` for public demos: blocks Sandbox payments and Kernel launches |
| `SESSION_SECRET` | Optional signing secret, at least 32 characters; otherwise generated under `DATA_DIR` |
| `PAYMENTS_MODE` | `demo` or `paypal-sandbox`; no live mode |
| `ALLOW_SANDBOX_AUTOPILOT` | Private Sandbox-only opt-in; the arm call also requires hash and explicit confirmation |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | Sandbox REST application credentials, server only |
| `PAYPAL_WEBHOOK_ID` | Registered Sandbox webhook ID for verification |
| `PAYPAL_PAYOUT_RECIPIENTS` | JSON object mapping allocation IDs to Sandbox recipient emails |
| `PAYPAL_GUIDE_EMAIL`, `PAYPAL_TELESCOPE_EMAIL`, `PAYPAL_TRANSPORT_EMAIL` | Alternative recipient configuration |
| `AGENT_MODE` | `deterministic`, `anthropic` or `gemini`; default remains deterministic |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Model credentials and an explicitly available model ID |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google AI Studio server credential and available Gemini model ID; no URL or `models/` prefix |
| `WEATHER_MODE` | `fixtures` or `aemet` |
| `AEMET_API_KEY`, `AEMET_STATION_ID` | OpenData key and actual station identifier |
| `KERNEL_API_KEY`, `KERNEL_SUPPLIER_URL` | Optional browser-session credential and approved HTTPS destination |
| `APIMATIC_CONTEXT_INSTALLED` | Development metadata only; set true only after actual installation and use |

Do not prefix secrets with `VITE_`, commit `.env`, paste keys into chat, or embed them in the UI. `node scripts/preflight.mjs` checks configuration presence without printing credential values. It cannot verify access, balance, permissions or correctness of credentials.

## Optional Google Gemini negotiation

Public hosting continues to use `AGENT_MODE=deterministic`. To opt in later, the user must verify the project's Free Tier status and model quota in [Google AI Studio](https://aistudio.google.com/), choose an actually available model ID, and then configure `AGENT_MODE=gemini`, `GEMINI_API_KEY` and `GEMINI_MODEL` on the server. No model ID is assumed or selected by this project. Configuration alone is not evidence of a real inference run. Missing credentials/model return 503; provider rejection or invalid proposals stop negotiation without silently falling back to local prices.

For the first private Gemini verification, use a **1,700 EUR budget** (`budgetMinor: 170000`) with the default **two guests and 20 minutes of scheduling flexibility**. Valid quotes from these suppliers can total 1,680 EUR; a 1,500 EUR budget may correctly reject a proposal even when every individual quote satisfies its supplier's limits. This recommendation applies to that default group and catalog, not larger groups or a different service configuration.

Record the following before describing Gemini as verified:

1. Confirm the selected model is available to the actual AI Studio project and its Free Tier quota has been checked.
2. Set its exact model identifier in `GEMINI_MODEL`, without a URL or `models/` prefix.
3. Observe three actual provider requests, one for each supplier, without recording credentials.
4. Confirm the negotiation returns `agentMode: "gemini"`, `provider: "gemini"` and the configured model ID.
5. Keep configuration presence separate from execution evidence: a key, a `configured` status or passing mocked tests does not prove real inference.

The adapter sends three independent REST requests to `https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent`. The key is only in `x-goog-api-key`, never a URL, prompt, receipt or browser bundle. Each supplier receives its own limits in `systemInstruction`, and the consumer brief separately in `contents`. The only declared function is `quote`, using `parametersJsonSchema` with forced function calling. Returned arguments are data: no function is executed by the model, and no payment or browser tool is exposed. The backend rechecks whole-cent prices against each supplier's floor/ask and rejects malformed, incomplete, extra-field or out-of-range proposals. See the [official REST function schema](https://ai.google.dev/api/generate-content#FunctionDeclaration), [generation endpoint](https://ai.google.dev/api/generate-content#method-models.generatecontent) and [structured-output guidance](https://ai.google.dev/gemini-api/docs/structured-output).

Google's [billing documentation](https://ai.google.dev/gemini-api/docs/billing) confirms Free Tier availability in the EEA, including the EU, for eligible models/projects and subject to quotas. An API key inherits its project's billing tier: this code cannot guarantee zero cost or infer whether billing has been enabled. It never enables billing, selects a paid fallback, retries quota failures automatically, or uses GitHub CLI credentials for inference. Use fictitious demo briefs and inspect the provider's current data-use terms before sending personal information. Live Gemini access has not been tested without an authorized key.

## PayPal Sandbox validation

Use the [official Sandbox account guide](https://developer.paypal.com/sandbox-testing/accounts) to obtain a business merchant, personal buyer and test app. Configure only Sandbox credentials. Buyer approval happens on PayPal, followed by the server authorization request. Never replace the buyer's approval with an application checkbox in an external run.

Demonstrate create → buyer approval → authorize → evidence evaluation → capture, and a separate authorization → failed condition → void. Keep provider IDs and verify the result in the Sandbox merchant account. Capture completion and Payouts completion require separate checks; a batch response is not proof that every recipient received a disbursement.

In local demo mode the customer can arm Autopilot after authorization. A SQLite job executes three seconds later without manual evaluate, execute or payout requests. Private Sandbox automation additionally requires `ALLOW_SANDBOX_AUTOPILOT=true` and an arm payload containing `confirmSandboxAutopilot: true`, `agreementHash` and `scenario`. Keep this disabled until the manual Sandbox flow is verified. Public demo mode does not permit Sandbox payments.

Webhooks require an externally reachable HTTPS endpoint and the matching app's webhook ID. Validate configured event handling against the implementation and [PayPal webhook documentation](https://developer.paypal.com/api/rest/webhooks/) before filming. Local fixture events do not prove webhook delivery.

When testing through Vite, set `PUBLIC_BASE_URL=http://localhost:5173` so buyer return URLs open the development frontend. For a production build served by Node, use its origin instead. This origin is public information, not a credential.

## Kernel browser session

Configure `KERNEL_API_KEY` and `KERNEL_SUPPLIER_URL` on the server. The adapter creates a browser session through Kernel's API and returns the provider's session ID and live-view URL when available. The destination is fixed by server configuration and restricted to a public HTTPS URL. Requests cannot choose a different destination.

This connector does not scrape supplier terms, book inventory, evaluate climate, or execute a browser-agent planning loop. Until a real account-backed run is recorded, describe it as an implemented, unverified adapter. See [Kernel documentation](https://www.kernel.sh/docs/).

## APIMatic development context

The [official marketplace](https://context.apimatic.io/) documents this installation command:

```powershell
pnpm dlx context-plugins install paypal
```

The plugin was installed in Codex on October 21, 2026 as `paypal@context-plugins`, version 0.4.1. Its integration and error-handling references were used to review uncertain capture responses and reconciliation. [The evidence note](APIMATIC-CONTEXT.md) describes the installation and implementation review. This application uses direct REST calls; it does not use the generated PayPal TypeScript SDK. APIMatic supplies development context and does not process payments or authorize runtime actions.

## Render deployment

`render.yaml` targets one Free web service with ephemeral `/tmp/asterion`, `PUBLIC_DEMO=true` and simulated payments. It has no disk and needs no external credentials. Render free services can spin down on idle and cold-start on the next visit. SQLite and guest-session keys are lost on redeploy, restart or spin-down. See [free-service limits](https://render.com/docs/free).

`render.persistent.yaml` is an optional paid alternative with one `0.5c-512mb` service and a 1 GB disk. It requires explicit budget approval before deployment. SQLite and the generated guest-session signing key are then written beneath `/var/data`. See [persistent disks](https://render.com/docs/disks), [compute plans](https://render.com/docs/compute-plans), [Blueprint specification](https://render.com/docs/blueprint-spec) and [pricing](https://render.com/pricing).

Apply only the selected Blueprint after connecting the repository; do not create both environments unintentionally. Auto-deploy is disabled. Keep public hosting in demo mode. PayPal Sandbox requires a private test environment with `PUBLIC_DEMO=false`, a correct `PUBLIC_BASE_URL` and server-side secrets.

Neither web-service Blueprint is Render Workflows usage. SQLite durability on a paid disk also requires keeping the service single-instance; it does not provide high availability or a backup policy.

## Weather evidence

[AEMET OpenData](https://opendata.aemet.es/dist/) requires an API key. Retrieve the station ID from AEMET metadata; do not invent one for the observatory. Renew keys according to [AEMET's current key policy](https://opendata.aemet.es/centrodedescargas/novedades). Actual observations are not a promise about future conditions. A feed without the contract's required cloud information cannot authorize a clear-sky capture.
