# n8n-nodes-babelbeez

n8n community nodes for Babelbeez voice agent automation.

Babelbeez helps teams create and embed OpenAI-powered real-time voice agents on their websites. This package will provide native n8n nodes for connecting Babelbeez voice agent events and metadata to n8n workflows.

> This repository is public. Do not commit `.env` files, real API keys, webhook signing secrets, n8n credential exports, customer data, or locally generated workflow credentials.

## Development

This project uses nvm for repo-local Node.js isolation.

```bash
nvm install
nvm use
npm install
```

The package is scaffolded with the official `@n8n/node` tooling.

Common commands:

```bash
npm run lint
npm run build
npm run dev
```

## Planned Nodes

- **Babelbeez Trigger**: receive signed `call_completed` webhook events from Babelbeez.
- **Babelbeez**: action node for listing voice agents, fetching monitored-entity schema, and retrieving test events.

## Credentials

Create a **Babelbeez API** credential in n8n with:

- **API Key**: your Babelbeez API/embed key from the Babelbeez dashboard.
- **Base URL**: defaults to `https://api.babelbeez.com`. Change this only when testing against a local or staging Babelbeez API.

The credential test calls `GET /api/v1/integrations/n8n/me` and sends the key in the `X-API-Key` header.

## Babelbeez Trigger Node

Use **Babelbeez Trigger** to start an n8n workflow when a selected Babelbeez voice agent finishes a call.

Setup:

1. Add the **Babelbeez Trigger** node to a workflow.
2. Select your **Babelbeez API** credential.
3. Choose a **Voice Agent Name or ID**.
4. Activate the workflow.

On activation, the node registers the n8n webhook URL with Babelbeez through `POST /api/v1/integrations/n8n/subscribe`. On deactivation, it unsubscribes through `POST /api/v1/integrations/n8n/unsubscribe`.

The node emits one item for each verified `call_completed` payload.

## Babelbeez Action Node

Use **Babelbeez** for setup, testing, and mapping support.

Available operations:

- **List**: list voice agents available to the credential.
- **Get Schema**: fetch the canonical `call_completed` fields plus monitored-entity `data` fields for a selected voice agent.
- **Get Test Event**: fetch a synthetic `call_completed` payload for workflow testing and mapping.

## Webhook Signature Verification

Babelbeez signs trigger deliveries with HMAC-SHA256. The trigger node verifies every incoming webhook before emitting workflow data.

Required headers:

- `X-Babelbeez-Event: call_completed`
- `X-Babelbeez-Timestamp`
- `X-Babelbeez-Signature: v1=<hex-hmac>`

Signature payload:

```text
{timestamp}.{rawBody}
```

Invalid signatures are rejected and no workflow item is emitted. The per-subscription signing secret is created by Babelbeez during trigger activation and stored in n8n workflow static data.

## Security Notes

The trigger node will enforce strict HMAC verification before emitting workflow items. Test fixtures must use fake deterministic secrets only. Never commit real subscription secrets, API keys, `.env` files, n8n credential exports, or customer payloads.

## Publishing

This package is intended to be published to npm as `n8n-nodes-babelbeez` from GitHub Actions with npm provenance. Before the first release, configure npm Trusted Publishing for:

- Repository owner: `fastfret888`
- Repository name: `n8n-nodes-babelbeez`
- Workflow filename: `publish.yml`
