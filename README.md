# n8n-nodes-babelbeez

n8n community nodes for Babelbeez voice agent automation.

Babelbeez helps teams create and embed OpenAI-powered real-time voice agents on their websites. This package provides a native n8n trigger for connecting Babelbeez completed-call events to n8n workflows.

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

## Node

- **Babelbeez Trigger**: receive signed `call_completed` webhook events from Babelbeez.

## Credentials

Create a **Babelbeez API** credential in n8n with:

- **API Key**: your Babelbeez API/embed key from the Babelbeez dashboard.

The credential test calls `GET /api/v1/integrations/n8n/me` and sends the key in the `X-API-Key` header.

## Babelbeez Trigger Node

Use **Babelbeez Trigger** to start an n8n workflow when a selected Babelbeez voice agent finishes a call.

Setup:

1. Add the **Babelbeez Trigger** node to a workflow.
2. Select your **Babelbeez API** credential.
3. Choose a **Voice Agent Name or ID**.
4. To test the trigger, click **Execute Step** in n8n, then complete a test call in the Babelbeez preview for the selected voice agent.
5. Use the received completed-call payload to configure downstream workflow nodes.
6. Activate the workflow when you are ready to receive production completed-call events.

During **Execute Step**, n8n creates a temporary test webhook URL. The trigger registers that URL with Babelbeez through `POST /api/v1/integrations/n8n/subscribe`, so the next completed call for the selected voice agent can appear directly in the n8n editor.

On workflow activation, the trigger registers the production n8n webhook URL with Babelbeez. On workflow deactivation, it unsubscribes through `POST /api/v1/integrations/n8n/unsubscribe`.

The node emits one item for each verified `call_completed` payload.

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
