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

## Security Notes

The trigger node will enforce strict HMAC verification before emitting workflow items. Test fixtures must use fake deterministic secrets only. Never commit real subscription secrets, API keys, `.env` files, n8n credential exports, or customer payloads.

## Publishing

This package is intended to be published to npm as `n8n-nodes-babelbeez` from GitHub Actions with npm provenance. Before the first release, configure npm Trusted Publishing for:

- Repository owner: `fastfret888`
- Repository name: `n8n-nodes-babelbeez`
- Workflow filename: `publish.yml`
