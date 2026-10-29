# ASTERION · functional video production plan

**Current edit:** the owner selected the neural [2:45 launch film](https://www.youtube.com/watch?v=l_cS_-SIsdQ), with [English script](video/ASTERION-Launch-Script.en.md), [aligned captions](video/ASTERION-Launch-Captions.en.srt) and [production provenance](video/ASTERION-Launch-Production.en.md). Its public access and metadata are recorded in [publication checks](evidence/youtube-publication.json). The 2:50 plan below is retained as the earlier editorial version and as guidance for a future continuous recording.

Use two visibly different evidence lanes. First, record the working public application with its simulated payment adapter. Then inspect the separately recorded Gemini and PayPal Sandbox proof. This is the practical route that needs no new credentials, model quota or Sandbox balance. The [earlier narration plan](DEMO.en.md) is retained below. The current [launch script](video/ASTERION-Launch-Script.en.md) and [English deck](presentation/ASTERION-Pitch.en-2026-10-27.pptx) use the revised 2:45 sequence. Any future private Sandbox checkout or €1,650 execution scene requires fresh original footage before it can be presented as a new run.

## Capture setup

- [Narration text and draft English subtitles](video/) are ready for rehearsal. Their provisional timing follows this plan and must be aligned to the final spoken edit.
- Open [Mission control](https://asterion-mj13.onrender.com/) and [Verified runs](https://asterion-mj13.onrender.com/#verified-runs) in separate tabs. Let the free service finish its cold start before recording.
- Record the browser application with a desktop screen recorder at 1920 × 1080 if available. Keep normal text readable; use close shots of the actual interface rather than shrinking the entire application into a decorative frame.
- Retain original continuous takes privately. Edit pauses only after a working clear and a separate cloudy mission have been captured. Save source footage and drafts under ignored `artifacts/video/`, not the public repository.
- Keep a visible `PUBLIC WALKTHROUGH · SIMULATED PAYMENTS & WEATHER` label during fresh public execution. During the provider proof, use `RECORDED PRIVATE RUN · PAYPAL SANDBOX · TEST FUNDS · FIXTURE WEATHER`.
- The existing PNGs are still-image evidence. Do not animate a historical screenshot into an apparent live checkout, add a fake cursor, or manufacture provider responses. Record current interaction with the evidence view instead.

## 2:50 edit decision list and narration

The narration below deliberately changes from €1,480 in the public simulation to €1,650 in the separately recorded provider proof. Keep that scene transition explicit.

| Final time | Original footage to capture | English narration |
| --- | --- | --- |
| 0:00–0:10 | Mission control: brief, weather condition and agreed-payment area in one readable view. Show the simulation label from the first frame. | “A customer wants a perfect night under the stars. The harder problem is deciding when an autonomous agent is allowed to spend.” |
| 0:10–0:30 | Fresh mission: default two guests, €1,500 ceiling and 20-minute flexibility. Submit the brief. Show the resulting €1,480 bundle and AG Grid supplier allocations. | “ASTERION converts intent into a spending mandate. In this public simulation, supplier agents negotiate a fourteen-eighty bundle within a fifteen-hundred-euro ceiling. The backend validates the price and every allocation.” |
| 0:30–0:48 | Open **Review terms** briefly. Show exact amount and policy, close it, tick consent and click **Simulate authorization**. Keep the changed authorization state visible. | “The customer approves the exact agreement, weather thresholds and cancellation terms. A language model may propose a deal. It cannot increase the approved budget or access payment tools.” |
| 0:48–1:15 | Select **Clear skies · conditions met**, then click **Arm autonomous execution** once. Show the running state, policy result, capture and three supplier outcomes. Leave the cursor still while the server progresses. | “Arm the mandate once. The server schedules the job, evaluates evidence and executes without another payment click. Here the fixture passes. Capture and supplier distribution complete as separate steps.” |
| 1:15–1:40 | Click **New mission**. Negotiate and approve a different agreement, select **Cloud cover · outside policy**, simulate authorization and arm it. Show **VOIDED**, with no capture or Payouts. | “A second agreement faces cloudy conditions. The same policy blocks capture and voids the authorization. This is a separate mission. Knowing when to refuse payment is part of the product.” |
| 1:40–2:18 | Cut to **Verified runs**. Retain its recorded-run disclosure. Show the €1,700 → €1,650 outcome strip, allocation table, then expand transaction references. Pause on capture and Payout batch identifiers. | “These next results are recorded private provider evidence. Three actual Gemini requests produced a sixteen-fifty agreement within seventeen hundred euros. That same agreement completed autonomous PayPal Sandbox capture and three individually checked supplier Payouts: four twenty-five, six twenty and four twenty-five. Test funds were used. Inventory and settlement weather were fixtures. The public records preserve the agreement link and transaction references.” |
| 2:18–2:38 | Show the source-record links, then return to Mission control and open **Read forecast**. Frame the model/valid/retrieval timestamps and the read-only warning. If time permits, export the fresh mission receipt and show its consistency-verifier result in a credential-free terminal. | “The receipt can be checked offline for internal consistency. A real MET Norway forecast is available for planning, with timestamps and attribution. It cannot unlock a payment. Local observations and actual operators are the next validation milestone.” |
| 2:38–2:50 | End on the application brand with readable demo and repository links. Keep final frame for at least two seconds. | “Agents negotiate. Evidence unlocks payment. La Palma is the first use case. ASTERION is infrastructure for complex purchases under one customer-approved mandate.” |

## Pickup shots and edits

Capture each complete mission before recording close shots. Do not trigger additional payment actions just to match narration. A successful provider status must be visible before a success caption appears. Preserve a visible `PENDING` state when it occurs.

For the public clear and cloudy scenes, label any removed waiting time `Execution wait shortened`. For a fresh private model run, label the measured inference delay; the existing historical run took approximately 55 seconds. Do not add “55 seconds elapsed” over the public deterministic negotiation.

The optional terminal shot should run only the offline command below against a receipt exported by the fresh walkthrough. It checks structure, hashes and agreement consistency; it does not authenticate a response with PayPal. Do not run it against the sanitized evidence-summary JSON files, which are a different format.

```sh
pnpm verify:receipt path/to/asterion-receipt.json
```

If the forecast request is unavailable while recording, show its actual unavailable state or use the previously recorded forecast screenshot labeled with its recorded date. Never turn that screenshot into a current observation or a settlement decision.

## Final captions to retain

| Scene | Persistent disclosure or short callout |
| --- | --- |
| Public execution | `SIMULATED PAYMENTS & WEATHER · DETERMINISTIC AGENTS` |
| Clear outcome | `One approved mandate · server execution · no second payment click` |
| Cloudy outcome | `SEPARATE AGREEMENT · VOIDED · NO CAPTURE` |
| Historical proof | `RECORDED PRIVATE RUN · GEMINI + PAYPAL SANDBOX · TEST FUNDS` |
| Historical allocations | `€425 + €620 + €425 suppliers · €180 organizer gross remainder` |
| Financial operations | `Capture → separate Payouts · not an atomic split` |
| Forecast | `MODEL FORECAST · READ-ONLY · DOES NOT UNLOCK PAYMENT` |

Do not label the €180 remainder as profit: provider fees, taxes and operating costs are not deducted. Keep caption text high contrast and inside the video frame. Add English subtitles after the spoken edit is locked, then check their timing against the actual narration.

## Release check

Watch the exported video from start to finish: duration below three minutes, readable amounts and statuses, audible narration, no credentials or account-management pages, and no claim that a historical screenshot is fresh execution. Open the public video link in a signed-out browser before adding it to the submission. The deck, video, repository and submission text must describe the same scope.

Source records: [integrated Gemini/Sandbox run](evidence/ai-sandbox-run.json), [model request metadata](evidence/gemini-verification.json), [separate cloudy Sandbox agreement](evidence/paypal-sandbox.json), [forecast record](evidence/weather-preview.json). The [official competition rules](https://paypalaihackathon.devpost.com/rules) are linked in the [delivery checklist](DELIVERY.es.md); recheck the final submission requirements before publishing.
