# Devpost submission draft

Reviewed 29 October 2026. The participant is registered and the [Devpost draft](https://devpost.com/software/asterion-061uwp) has its story, media, links and additional answers saved. The selected [2:45 neural film](https://www.youtube.com/watch?v=l_cS_-SIsdQ) is publicly accessible; [publication verification](evidence/youtube-publication.json) records the anonymous-access and browser checks. The owner declined optional YouTube thumbnail and additional caption-track changes. Final review and Devpost submission remain open.

## Project name

ASTERION

## Elevator pitch

Agents negotiate the whole experience. Evidence unlocks PayPal capture. One customer-approved mandate—and the power to refuse payment.

## Inspiration

**The most important button in autonomous commerce is the one an agent refuses to press.**

A night under the stars is one outcome, even when three suppliers must deliver it. The customer wants the guide, telescope and transport to work together under the same budget and sky conditions. Coordinating separate offers and cancellation terms creates work and uncertainty before the experience begins.

We asked a different question: when should an agent be allowed to complete the purchase? ASTERION turns the intended outcome into one approved mandate. Supplier agents propose a bundle, while the application enforces the buyer's budget and conditions. Its ability to refuse a payment is part of the product.

## Who it is for

The first proposed customer is an experience organizer coordinating several suppliers. Our La Palma use case combines a private guide, portable telescope and transport at a permitted observation site near Roque de los Muchachos. The proposed operator pilot would test coordination time, customer understanding and payment disputes. Actual operators, bookings, customers and commercial revenue remain a future validation milestone.

## What it does

The buyer approves the exact bundle, price and evidence policy. After authorization, arming Autopilot saves a server job. That job checks the evidence and captures or voids the authorization without another payment click. AG Grid shows supplier allocations and financial states. A complete receipt explains each decision and can be checked offline for internal consistency.

The evidence follows one agreement throughout: on October 23, Canary Islands time, three actual Gemini requests produced a €1,650 agreement within a €1,700 ceiling. That buyer-approved agreement completed autonomous PayPal Sandbox capture and three individually confirmed supplier Payouts of €425, €620 and €425. The organizer's €180 remainder is gross before costs. One organizer is the merchant, and the supplier transfers are separate operations after capture. A different cloudy agreement voided its authorization without capture.

The public walkthrough is reproducible without accounts or keys. It uses deterministic agents, fixture weather and simulated payments. The private provider run used actual Gemini and PayPal Sandbox requests with test funds, while inventory, availability and settlement weather remained simulated. A separate MET Norway forecast supports read-only planning. Complete local settlement observations, actual reservations and webhook delivery remain unverified.

## How we built it

React and Vite power the interface. AG Grid Community provides the operations table. A Node.js 24 HTTP service owns agreement transitions and SQLite persistence. Autopilot persists a scheduled job before acknowledging it, then evaluates and settles without further browser commands. The payment adapter separates order creation, buyer approval, authorization, evidence-gated capture or void, reconciliation and supplier payouts. Optional Gemini and Anthropic adapters supply model-generated negotiation proposals without giving the model direct authority to settle money. An optional AEMET adapter retrieves observations and refuses to treat missing astronomical evidence as clear skies.

The public demo runs on a free Render web service in Frankfurt. Deployed application revision `a23e4cd` passed 143 automated tests, build, preflight and smoke. Hosted clear and cloudy flows and complete browser receipt downloads were verified on October 26. Historical provider runs retain their own dates and software baselines. Guest sessions scope agreements and receipts to the browser. Free hosting has cold starts and ephemeral storage, and public-demo mode blocks Sandbox payment and Kernel launch requests.

APIMatic's Context Plugin supported PayPal implementation review during development. This is a development workflow, while AG Grid and Render participate in the working application. Kernel has a configurable browser-session adapter with external execution pending. Astropods, Elastic and Channel3 are proposed extensions.

## Challenges

The hard part is preserving distinctions that a chat interface can hide: a forecast is not an observation; an authorization is not a captured payment; a capture is not three successful supplier transfers; and an agent's recommendation is not permission to spend. We made these boundaries visible in the agreement state and demonstration.

## Accomplishments we can demonstrate

- A working mandate-to-payment walkthrough and AG Grid operations view, with clear and failed-condition paths.
- Autonomous execution after arming, persisted agreement and job state, and restart recovery when the database survives.
- Three actual Gemini supplier quotes followed by capture and three individually checked PayPal Sandbox Payouts for that same agreement.
- A separate failed-condition Sandbox authorization void, with provider states checked through authenticated queries.
- Complete browser receipt downloads that pass the offline consistency verifier.
- An actual MET Norway forecast preview with provider timestamps, attribution and a boundary that prevents it from authorizing settlement.

The [integrated AI → Sandbox evidence](evidence/ai-sandbox-run.json), [model request metadata](evidence/gemini-verification.json) and [baseline PayPal outcomes](evidence/paypal-sandbox.json) separate actual provider results from simulated inventory and weather. Webhook delivery still requires verification.

## What we learned

Useful agent autonomy requires an explicit mandate and a deterministic boundary around financial side effects. The quality of an agentic payment product is also visible in the transactions it refuses to execute.

## What's next

Complete the real oracle and operator integrations, then pilot with an actual operator and permitted site. Add authenticated operator access, durable orchestration and complete location-specific evidence. Deploy supplier agents independently and expand to other coordinated purchases with measurable fulfillment conditions.

## Built with

Node.js 24, React, Vite, SQLite, PayPal Sandbox REST APIs, Gemini generateContent, AG Grid Community, MET Norway Locationforecast and Render. APIMatic's PayPal Context Plugin supported development review.

## Submission desk

The sections above contain the project description. The notes below track evidence and remaining submission fields; they are not part of the public pitch.

## Entry links and evidence status

- Public repository: https://github.com/Enrickq/asterion-commerce; deployed application commit: `a23e4cd5d049dd4e4de1a55768bd46e5b3e0a48c`.
- Public demo: https://asterion-mj13.onrender.com/; hosted flows verified, see [record](VERIFICATION.es.md).
- Public video: https://www.youtube.com/watch?v=l_cS_-SIsdQ. Anonymous access, 165-second duration, playable state and public visibility were checked on October 28. Browser checks confirmed the title, description, chapters and visible AI disclosure; see [publication verification](evidence/youtube-publication.json). Use this exact URL in the Devpost video field.
- Captions: YouTube exposes an English automatic track. The exact [64-cue SRT](video/ASTERION-Launch-Captions.en.srt) remains available in the repository and rendered into the film. The owner declined an additional selectable track and thumbnail change on October 29; these optional tasks are closed.
- Local launch-film runtime: **verified, 165 seconds (2:45)**; [media verification](evidence/launch-film.json). The owner selected the neural narration on October 28 after comparing both versions. The selected film uses the [64-cue English captions](video/ASTERION-Launch-Captions.en.srt). [Title and description reference](video/YOUTUBE-LAUNCH.en.md).
- Actual PayPal Sandbox authorization/capture/void and three individual Payouts: **verified**, [sanitized record](evidence/paypal-sandbox.json). Autonomous clear and cloudy Sandbox outcomes: **verified**. Webhook delivery: **pending**.
- Complete three-supplier Gemini negotiation and subsequent autonomous Sandbox settlement: **verified**, [integrated record](evidence/ai-sandbox-run.json).
- AG Grid Community and Render Web Service usage: **verified**. APIMatic Context Plugin: installed and consulted during development. Kernel external execution and the proposed Astropods, Elastic and Channel3 integrations: **pending**. Sponsor-category eligibility and selection require a separate review of the final entry.
- Recorded private outcomes are visible in the hosted **Verified runs** view. Complete receipt exports can be checked offline with `pnpm verify:receipt`; this checks internal consistency, not provider authenticity.
- Submission requirements, prize compatibility and cutoff checked against the [official rules](https://paypalaihackathon.devpost.com/rules), most recently on October 29, 2026. Participant registration is complete and eligibility declarations were confirmed by the participant. The draft shows **4/5 steps**; final terms and submission remain **pending**. See the [readiness review](SUBMISSION-READINESS.en.md).

The official cutoff is **November 12, 2026, 12:00 PST (20:00 Canary Islands time)**. Submission materials need English or an English translation. The [English pitch deck](presentation/ASTERION-Pitch.en-2026-10-27.pptx), [launch-film script](video/ASTERION-Launch-Script.en.md) and [aligned captions](video/ASTERION-Launch-Captions.en.srt) support the entry. The selected 2:45 film combines original motion and score, an illustrated landscape, actual captured application steps and local neural narration. [Voice and publication checks](video/VOICE-PUBLICATION.en.md) record the reviewed sources and observed AI disclosure. The public video is verified and the Devpost draft is saved; final review and submission remain open. The [prize case](PRIZE-CASE.en.md) maps each general award and the evidenced sponsor uses to inspectable results.
