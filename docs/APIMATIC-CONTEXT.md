# APIMatic development evidence

The PayPal Context Plugin from APIMatic's Context Plugins Marketplace was installed into Codex on 21 October 2026 with telemetry disabled:

```sh
CP_TELEMETRY=off pnpm dlx context-plugins install paypal --targets codex --yes
```

The installer reported `Installed paypal@context-plugins`, version 0.4.1 in the local plugin cache. A new Codex session is required for automatic plugin loading.

The integration and error-handling references were read during the implementation review. They were used to review duplicate-write claims, uncertain payment outcomes, server-only credentials and sanitized error boundaries. This application uses a direct REST adapter, not the plugin's generated `paypal` TypeScript SDK. SDK-specific signatures, environments and error classes are not claimed as dependencies or implementation details.

The relevant review is represented in `server/core.mjs`, `server/connectors/paypal.mjs`, `server/connectors/shared.mjs` and the provider-failure, lost-response and duplicate-capture tests. The context is a development aid, not a runtime payment authorization service.

Sources:

- [Hackathon APIMatic integration](https://paypalaihackathon.devpost.com/details/apimatic)
- [Context Plugins Marketplace](https://github.com/context-plugins/plugin-marketplace)

Installation and a development review do not establish an active APIMatic runtime integration, use of its generated SDK, or entitlement to a sponsor prize. Judges assess meaningful use.
