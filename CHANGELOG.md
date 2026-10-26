# Changelog

## 2026-10-26 · Complete browser receipt downloads

- Fixed the browser API client returning only a receipt's nested agreement. Downloads now preserve payment references, consent, evidence, events and integrity metadata alongside the approved terms.
- Added an HTTP regression covering settled and voided receipts through the same client used by the interface, then checking both with the offline verifier.
- Restored the recorded weather-scenario label for completed or running agreements and refreshed the registry when opening it, so prior selections and cached rows do not misdescribe another agreement.

## 2026-10-25 · English jury presentation

- Added a ten-slide editable English PowerPoint with native allocation, architecture and roadmap tables, presenter notes and source references.
- Updated the recording script and shot list to separate a fresh public €1,480 simulation from inspection of the historical €1,650 Gemini / PayPal Sandbox evidence.
- Added the 258-word narration transcript and 36 draft English subtitle cues for the planned 2:50 edit. Caption timing still requires alignment to the recorded speech.
- Linked the deck and recording materials from the reviewer documentation. The final functional video, YouTube upload and Devpost submission remain pending.

## 2026-10-25 · Recorded evidence and receipt integrity

- Added **Verified runs**, a public read-only view of the historical Gemini → PayPal Sandbox agreement, individual supplier payments, source records and a separate cloudy-condition void. The interface labels test funds and simulated settlement weather.
- Separated capture and supplier distribution milestones. Uncertain voids, declined captures and refunds no longer produce a generic capture-success message.
- Preserved complete exported event histories beyond 100 events and added an offline receipt consistency verifier. The smoke check now validates exported receipts, including their event chains and financial references.
- Added explicit full/partial refund reconciliation states and blocked further spending actions after a refund. Existing supplier transfers remain separate obligations to review.
- Bound Payout results to the actual privately configured recipient as well as amount, currency, allocation and provider references. Returned records expose a match flag, not addresses.
- Improved decision-text readability, responsive layouts and native modal keyboard/focus behavior. Prevented an old polling response from restoring a previously selected agreement.
- Reorganized the README around reproducible behavior and recorded evidence, with a live CI badge and reviewer path.
- Updated CI to verified Node.js 24 action releases pinned by commit SHA, disabled persisted checkout credentials, and fixed the Linux runner version for reproducibility.

These changes do not create new provider verification runs. Historical evidence retains its original dates and software baselines. The public payment walkthrough remains a simulation.

## 2026-10-24 · Forecast preview and local evidence policy

- Added a cached MET Norway forecast preview for fixed Roque-area coordinates with timestamps, attribution and a settlement veto.
- Versioned the location and altitude tolerances in new agreement terms. Actual-evidence checks reject stale, incomplete, duplicated or non-local observations.
- Kept forecasts separate from local observations and approved financial authority. Recorded actual forecast retrieval through the public application on October 25.
