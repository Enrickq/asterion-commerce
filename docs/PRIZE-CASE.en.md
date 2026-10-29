# ASTERION prize case

Reviewed 29 October 2026. This is a map of inspectable strengths for the entry, not an award prediction or a record of submitted category selections.

The [official FAQ](https://paypalaihackathon.devpost.com/details/faqs) says projects using several sponsor tools are considered for each corresponding sponsor prize. One project can receive at most one Grand Prize or one Honorable Mention, plus one Sponsor Prize. The [rules](https://paypalaihackathon.devpost.com/rules) govern eligibility and judging. Participant registration is complete and the [ASTERION draft](https://devpost.com/software/asterion-061uwp) is saved, with **AG Grid, APIMatic and Render** selected. The interface shows 4 of 5 steps; final review, terms acceptance, **Submit project** and the submission confirmation remain pending. Saved selections do not establish final eligibility or a submitted candidature.

## General awards

| Award | Case for ASTERION | Inspectable proof |
| --- | --- | --- |
| Best Overall | A functioning product connects an approved mandate, supplier proposals, a conditional payment decision and complete receipts. | [Reviewer guide](JUDGES.en.md), [source and setup](../README.md), [CI](https://github.com/Enrickq/asterion-commerce/actions/workflows/ci.yml). |
| Most Creative | A coordinated purchase becomes one explicit mandate whose conditions can prevent payment. The La Palma story makes that decision visible. | [Agreement and execution architecture](ARCHITECTURE.md), [film](https://www.youtube.com/watch?v=l_cS_-SIsdQ). |
| Most Impactful | Experience organizers coordinate several suppliers for one customer outcome. A pilot can measure coordination time, customer understanding and disputes. | [Audience and proposed pilot](SUBMISSION.md#who-it-is-for). These benefits remain hypotheses; no customer traction or measured savings are claimed. |
| Best Demo Delivery | A 165-second film opens with a refusal question, demonstrates a working purchase, shows a separate failed-condition agreement and inspects historical provider results. | [Public film checks](evidence/youtube-publication.json), [script](video/ASTERION-Launch-Script.en.md), [media provenance](video/ASTERION-Launch-Production.en.md). |
| Best Use of PayPal + AI | Three Gemini requests produced the same €1,650 agreement that completed autonomous Sandbox capture and three individually confirmed supplier Payouts. | [Integrated provider record](evidence/ai-sandbox-run.json), [PayPal connector](../server/connectors/paypal.mjs). |
| Best Use of Agentic Commerce | Agents propose terms; the customer approves bounded authority; the server evaluates evidence and captures or voids after arming, without another payment click. | [Core execution](../server/core.mjs), [job persistence](../server/store.mjs), [separate cloudy Sandbox outcome](evidence/paypal-sandbox.json). |

The public walkthrough uses simulated payments, deterministic agents and fixture weather. Historical Gemini and Sandbox requests used test funds with simulated inventory and settlement weather. Payouts are separate operations after capture by one organizer merchant. These boundaries apply to every award case.

## Sponsor uses and requirements

| Sponsor | Current evidence | Match to the sponsor brief |
| --- | --- | --- |
| APIMatic | Context Plugin installed and consulted for PayPal implementation review. [Development evidence](APIMATIC-CONTEXT.md). | The [official page](https://paypalaihackathon.devpost.com/details/apimatic) describes this development workflow. Identify concrete review decisions; no generated runtime SDK is claimed. |
| AG Grid | Community grid with custom theme, sortable/resizable columns and stable supplier rows. [Component](../src/ProviderGrid.jsx). | The [official page](https://paypalaihackathon.devpost.com/details/aggrid) emphasizes dashboard polish, custom widgets/layout and AG Studio's Agent Framework. Community usage is evidenced; AG Studio and its framework are not implemented. |
| Render | Hosted Node web service, health configuration and verified browser flows. [Blueprint](../render.yaml), [deployment record](VERIFICATION.es.md). | The [official page](https://paypalaihackathon.devpost.com/details/render) calls for deployment and Render Workflows. The web service is real; orchestration currently uses Node/SQLite. Full alignment with that Workflows brief is unverified. |
| Bryntum | No integrated Bryntum component. | The [official page](https://paypalaihackathon.devpost.com/details/bryntum) describes its scheduling components. A meaningful integration and demonstration would be new work before claiming use. |
| Channel3 | Planned extension; no verified external calls. | The [official page](https://paypalaihackathon.devpost.com/details/channel3) requires meaningful API/MCP use. An equipment-search feature would need actual results, provenance and a demonstrated product role; a mention alone does not qualify. |

## Entry checklist

1. Review the [saved Devpost draft](https://devpost.com/software/asterion-061uwp). The name, tagline, 845-word story, three gallery images, actual technology tags and video/demo/source links are saved. Additional information and the participant's eligibility declaration are saved; this declaration does not replace the organizer's verification.
2. Check that the selected sponsor tools remain AG Grid, APIMatic and Render, with the evidence and limitations above. Bryntum and Channel3 are not selected as used tools. A saved selection is not a submitted entry.
3. Review and accept the final terms, press **Submit project** before the deadline and keep the submission confirmation. These final actions remain pending.

The selected film is final for this delivery. Optional thumbnail and additional selectable caption-track changes were declined by the owner; the exact English SRT remains available and its captions are rendered into the film.
