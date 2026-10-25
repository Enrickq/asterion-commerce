# Weather evidence and forecast preview

## Two separate paths

The approved agreement uses its configured evidence adapter. The public reproducible walkthrough retains `WEATHER_MODE=fixtures`. Fixture readings are simulated and labeled. Optional AEMET observations remain incomplete without local cloud information and a second adequate source.

The separate **Read forecast** control requests `GET /api/weather/preview`. This is a read-only planning view backed by MET Norway Locationforecast 2.0. It neither changes an agreement nor invokes authorization, capture, void or Payouts. Caller-supplied coordinates and URLs are not passed to the provider.

This endpoint uses a fixed location near Roque de los Muchachos: latitude 28.754, longitude -17.885 and requested ground elevation 2,396 m. These are application scenario coordinates, not a claim that a sensor or an operator is installed there.

## Provider contract

- [Locationforecast documentation](https://api.met.no/weatherapi/locationforecast/2.0/documentation) describes the `compact` GeoJSON endpoint and its ground-elevation parameter.
- The [data model](https://docs.api.met.no/doc/locationforecast/datamodel.html) defines `cloud_area_fraction`, `relative_humidity` and `wind_speed`. ASTERION converts wind from m/s to km/h and validates values and units rather than treating missing readings as zero.
- Forecast valid time, model update time and retrieval time retain separate meanings. `observedAt` is null: a forecast is not an observation.
- The provider's returned coordinates are preserved separately from the requested location. They do not identify a physical weather station or certify the numerical model's actual grid cell.
- The adapter deduplicates concurrent requests, caches for at least three hours and respects a later provider expiry. MET Norway's [Locationforecast FAQ](https://docs.api.met.no/doc/locationforecast/FAQ.html) recommends waiting at least half of the six-hour update interval outside the Nordic area. Conditional requests use the original Last-Modified header when available.
- Requests identify ASTERION and the public repository. Attribution and conversion disclosure appear beside the data. See [service terms](https://docs.api.met.no/doc/TermsOfService.html) and [licensing policy](https://docs.api.met.no/doc/License.html): data are attributed to MET Norway under CC BY 4.0.

The preview is `simulated:false` because its values come from an external API. It is also `evidenceType:'model-forecast'`, `complete:false`, `requiresReview:true` and `settlementReady:false`. None of these labels can be collapsed into “weather conditions verified.” Its hash records the received payload; it is not a provider signature or proof that the forecast is accurate.

## Settlement boundary

New agreements include weather policy version 1.1. For actual observations, the application checks source timestamps, identities, HTTPS provenance, local coordinates, altitude and all required readings. The scenario's approved location tolerances are a 1,500 m radius and ±150 m altitude. These are application policy choices, not scientific guarantees of sky quality.

Two renamed copies of one source do not satisfy the source count. Duplicate identities or provenance are rejected. Distinct `independenceGroup` values describe lineage declared by the trusted server adapter; they do not independently establish scientific independence. A production oracle needs a vetted source registry, authorized local instruments, calibration and operator validation.

Missing timestamps or required measurements, stale data, location mismatch, mixed simulation and observations, explicit vetoes and model forecasts block actual-evidence settlement. Previously stored agreements keep their original terms and hashes. They are not silently upgraded to a new policy.

The current adapters do not provide two complete local observations. Thus the end-to-end successful payment examples still use fixture weather, including the actual PayPal Sandbox runs. Real weather authorization remains a milestone rather than a completed claim.

An actual application preview was checked locally on October 24 and publicly on Render on October 25, 2026; see the [normalized API record](evidence/weather-preview.json). Its origin field identifies the environment tested. Automated tests use synthetic responses and are not evidence that the provider was contacted.

## Other sources investigated

ING and NOT expose useful public observatory weather information, but that does not by itself establish a stable API or a right to republish it. GTC's legal notice restricts reuse. No automatic public scraper was added for those sites. AEMET has a documented OpenData service but requires a key and does not alone complete the astronomical evidence policy.

References: [ING weather](https://astro.ing.iac.es/weather/index.php), [NOT telemetry archive](https://www.not.iac.es/observing/forms/telemetry/), [GTC legal notice](https://www.gtc.iac.es/gtc/legal_es.php), [AEMET OpenData](https://opendata.aemet.es/dist/).
