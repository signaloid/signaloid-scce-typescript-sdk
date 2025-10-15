# Signaloid Cloud Compute Engine SDK for JavaScript/TypeScript

The **Signaloid Cloud Compute Engine SDK** provides a simple interface to interact with the [Signaloid Cloud Compute Engine](https://docs.signaloid.io/) from JavaScript or TypeScript applications. It supports both **Node.js** and **browser** environments.

---

## Installation

The package is publicly available through **GitHub Packages**.

Authenticate using your GitHub Access Token:

```
echo "Enter your GitHub Access Token with read:packages and repo scopes:" && read -s GITHUB_TOKEN && npm config set @signaloid:registry https://npm.pkg.github.com/ && npm config set //npm.pkg.github.com/:_authToken $GITHUB_TOKEN
```

Then install the SDK with your preferred package manager:

```bash
npm install @signaloid/scce-sdk
```

---

## Quick Start

```typescript
import { createClient } from "@signaloid/scce-sdk"; // or const { createClient } = require('@signaloid/scce-sdk');

async function main() {
  const client = createClient({
    method: "apiKey",
    key: process.env.SIGNALOID_API_KEY,
  });

  // Example: list available cores
  const cores = await client.cores.list();
  console.log(cores);
}

main().catch(console.error);
```

---

## Features

- Unified TypeScript SDK for **Node.js** and **browser**
- **Typed access** to all Signaloid Cloud Compute Engine APIs
- Includes built-in managers for:
  - **Auth**, **Buckets**, **Builds**, **Cores**, **Datasources**, **Drives**, **Files**
  - **GitHub**, **Health**, **Keys**, **Plotting**, **Repositories**
  - **Samples**, **Subscriptions**, **Tasks**, **Things**, **Users**, **Webhooks**
- Real-time communication via **WebSockets** and channel subscriptions
- Designed for extensibility and easy integration

---

## Documentation

For full API documentation and guides, visit the [Signaloid Developer Docs](https://docs.signaloid.io/docs/api/).
