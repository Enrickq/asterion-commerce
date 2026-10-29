# Review ASTERION

**One approved mandate. Agent proposals. A payment decision the customer can inspect.**

ASTERION helps experience organizers coordinate several suppliers under one budget and one evidence policy. The first use case is private stargazing in La Palma: a guide, telescope and transport.

## Start here

| Open | What it demonstrates |
| --- | --- |
| [Watch the 2:45 film](https://www.youtube.com/watch?v=l_cS_-SIsdQ) | A mandate, clear-condition execution, a separate cloudy refusal and recorded Gemini/PayPal Sandbox evidence. |
| [Try Mission control](https://asterion-mj13.onrender.com/) | A complete interactive walkthrough without accounts or keys. Public payments, agents and settlement weather are simulated. |
| [Inspect the recorded agreement](evidence/ai-sandbox-run.json) | Three actual Gemini requests followed by capture and three individually confirmed Sandbox supplier Payouts for that same agreement. |
| [Open the ten-slide pitch](presentation/ASTERION-Pitch.en-2026-10-27.pptx) | Customer, architecture, financial authority, evidence and the proposed business model. Tables and speaker notes remain editable. |

The free demo may take a cold start. The film is an edited demonstration with historical provider evidence; it does not imply a fresh private execution or a real booking.

## Exercise both decisions

1. Negotiate the default two-person mission with a €1,500 ceiling. Inspect the proposed €1,480 bundle and approve its terms.
2. Simulate authorization, choose clear skies and **Arm autonomous execution**. The server evaluates the fixture, completes capture and records separate supplier transfers.
3. Start a **new mission**, negotiate, approve its terms and simulate a new authorization. Choose the cloudy scenario and arm it. That agreement voids its authorization without capture or supplier disbursements.
4. Download either complete receipt. From the repository, run `pnpm verify:receipt path/to/asterion-receipt.json` to check internal consistency offline.

## Follow the financial proof

The recorded private test has a **€1,700 ceiling → €1,650 agreement → completed Sandbox capture → three SUCCESS Payouts**. Allocations are €425 for the guide, €620 for equipment and €425 for transport, plus a €180 organizer gross remainder before fees and taxes. All funds are fictitious; supplier inventory, availability and settlement weather are simulated.

One organizer is the merchant. Supplier Payouts are separate operations after capture and use its available balance. The model receives quote tools; it cannot alter consent or invoke payment tools. Uncertain provider results require reconciliation. [Architecture](ARCHITECTURE.md) · [Receipt scope](RECEIPTS.md).

## Verify or build further

- [Local setup and checks](../README.md#run-locally): Node.js 24+, pnpm, a reproducible default demo and CI.
- [Integration matrix](INTEGRATIONS.md): implemented adapters, verified uses and proposed extensions.
- [Public video checks](evidence/youtube-publication.json): anonymous access, duration, disclosure and caption status.
- [Submission readiness](SUBMISSION-READINESS.en.md): remaining participant fields and final entry status.

Complete local weather observations, actual operator reservations, webhook delivery and production-money operation remain validation milestones. They are not represented as completed features.
