# Verify an exported receipt offline

ASTERION can export the complete agreement terms, approval, weather evidence, evaluation, payment references and hash-linked event history. Download **Export receipt** from an agreement, then run:

```sh
node scripts/verify-receipt.mjs path/to/asterion-receipt.json
```

Node.js 24 is the supported project runtime. The verifier makes no network requests, reads no environment file and needs no credentials. It prints a JSON report with `valid`, individual `checks`, `warnings` and a concise `summary`.

| Exit code | Meaning |
| --- | --- |
| `0` | The supported receipt passed the implemented consistency checks |
| `1` | A receipt check failed, including an unsupported or incomplete format |
| `2` | Invalid command usage, unreadable JSON or a file larger than 32 MiB |

## What is checked

- SHA-256 of canonical approved terms, independently recomputed from the exported agreement.
- Every event hash and its predecessor link, unique event IDs, complete event count and final event hash.
- Approved positive integer EUR cents, budget ceiling and allocation total.
- Matching environment, approval hash, approved amount and currency.
- Evidence/evaluation binding and consistent captured or voided state.
- Payment references against their available event bindings; supplier allocation IDs, amounts, currency, sender references and unique payout item IDs.
- Three successful payout items before accepting `SETTLED`; no capture or payout in a `VOIDED` receipt.
- Autopilot agreement and job-outcome bindings when a job is present.

Checks operate on the complete `asterion.receipt.v1` export. They do not trust the receipt's own green integrity flags without recomputing hashes. The export must retain the entire event array, including histories exceeding 100 events.

## What a valid result means

`valid:true` means that this JSON document passed internal consistency checks. Someone who controls an entire document can rewrite its terms and recalculate every hash. Hash chaining is not a digital signature or an external timestamp.

The verifier does not authenticate PayPal or Google, contact the providers, certify a weather sensor, establish actual service delivery, or turn test funds into real funds. `environment:'demo'` means simulated payments. `environment:'paypal-sandbox'` means test accounts and test funds.

Some capture references recovered through reconciliation are not directly bound into an event by this schema. The payment section also does not always retain a separate provider amount response. The report exposes those limits as warnings; it does not invent an attestation.

## Public evidence records are a different format

Files under [`docs/evidence/`](evidence/) are sanitized summaries of separately verified runs. They intentionally omit full private agreement and event data. The verifier rejects these summaries as complete receipt inputs. They remain useful evidence records with their own scope and verification methods.

Keep downloaded receipts private unless you have reviewed the intent text, agreement identifiers and event data for publication. No receipt or JSON summary should contain credentials.
