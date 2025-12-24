# ECS Indexer

High-performance indexer for the **Ethereum Credential Service (ECS)** protocol using [Ponder](https://ponder.sh).

## Overview

ECS is a decentralized registry of Smart Credentials—verifiable onchain or offchain data about any identity. This indexer tracks all ECS protocol activity including credential registrations, resolver deployments, ERC-8049 metadata updates, and more.

## Indexed Contracts

**Sepolia Testnet:**
- ECS Registry: `0x1Cc0E6c3B645D7751DE7Ff7ce7d17cD228e4a4F2`
- ECS Registrar: `0x86a67901820da1e3523Db67d02083C0a08170b37`
- Credential Resolver Factory: `0xb5b31DEb61f6b9Dd61b222ad50084e11EF53B8E3`
- Credential Resolvers: Dynamically indexed via factory events

## Events Indexed

**ECS Registry:**
- NewLabelhashOwner - New credential registrations
- Transfer - Ownership transfers
- ResolverChanged - Smart Credential address updates
- ResolverReviewUpdated - Admin reviews
- ExpirationExtended - Expiration extensions
- ApprovalForAll - Operator approvals

**ECS Registrar:**
- NameRegistered - Registration payments
- NameRenewed - Renewal payments

**Credential Resolver Factory:**
- ResolverCloneDeployed - New Smart Credential deployments

**Credential Resolvers (Smart Credentials):**
- TextChanged - ENS text record updates
- AddrChanged - ETH address updates
- AddressChanged - Multi-coin address updates
- ContenthashChanged - Contenthash updates
- ContractMetadataUpdated - ERC-8049 metadata updates
- OwnershipTransferred - Resolver ownership changes

## Quick Start

**Install dependencies:**
```bash
pnpm install
```

**Configure environment:**
```bash
cp .env.example .env.local
# Edit .env.local with your RPC URL
```

**Run locally:**
```bash
pnpm dev
```

The indexer will start syncing and expose an API at `http://localhost:42069`.

**Requirements:**
- Node.js 18.17.0+ (pinned in `.nvmrc` and `package.json`)
- pnpm (installed automatically during build)

## API Documentation

See [API_REFERENCE.md](./API_REFERENCE.md) for complete API documentation.

**Quick Reference:**
- `GET /api/health` - Health check (public)
- `GET /api/credentials` - List all registered credentials
- `GET /api/credentials/:chainId/:labelhash` - Get credential by labelhash
- `GET /api/credentials/by-label/:label` - Get credential by label
- `GET /api/credentials/by-owner/:address` - Get credentials by owner
- `GET /api/resolvers` - List all deployed resolvers
- `GET /api/resolvers/:chainId/:address/info` - Get resolver info (public, mirrors `getResolverInfo()`)
- `GET /api/resolvers/:chainId/:address/metadata` - Get ERC-8049 metadata
- `GET /api/stats` - Get global statistics

**API Authentication:**

Most endpoints require an API key (except those marked as public):

```bash
curl -H "Authorization: Bearer sk-ecs-YOUR_KEY" \
  http://localhost:42069/api/credentials
```

## Deployment to Render

**Production URL:** https://ecs-indexer.onrender.com

1. Push this repository to GitHub
2. Go to [render.com](https://render.com) and create a new **Blueprint**
3. Connect your GitHub repository (`nxt3d/ecs-indexer`)
4. Render will detect `render.yaml` and auto-configure:
   - Web service: `ecs-indexer`
   - PostgreSQL database: `ecs-indexer-db` (free tier)
5. Set environment variables in Render dashboard:
   - `PONDER_RPC_URL_11155111` - Your Sepolia RPC URL (required)
   - `API_KEY` - Your secure API key (generate with: `node -e "console.log('sk-ecs-' + require('crypto').randomBytes(32).toString('base64url'))"`)
   - `ALLOWED_ORIGINS` - Comma-separated allowed origins (e.g., `https://yourdomain.com`)
6. The database will be automatically linked and `DATABASE_URL` injected
7. Deploy and verify: `curl https://ecs-indexer.onrender.com/api/health`

**Note:** If you create the service manually instead of using Blueprint, you'll need to manually create and link the PostgreSQL database. The `render.yaml` database section only applies when using Blueprint.

## Database Schema

- **credentials** - Registered labels (e.g., name-stars.ecs.eth)
- **resolvers** - Factory-deployed Smart Credentials (CredentialResolver clones)
- **textRecords** - ENS text records on resolvers
- **contractMetadata** - ERC-8049 metadata entries
- **addressRecords** - Multi-coin address records
- **credentialTransfers** - Credential ownership history
- **resolverTransfers** - Resolver ownership history
- **renewals** - Credential renewal history
- **approvals** - Operator approvals

## Testing

Run the test suite:

```bash
pnpm test
```

This tests all API endpoints against the running indexer.

## Related Projects

- [ECS Protocol](https://github.com/nxt3d/ecs) - Smart contracts
- [@nxt3d/ecsjs](https://www.npmjs.com/package/@nxt3d/ecsjs) - JavaScript SDK
- [Ponder](https://ponder.sh) - Indexing framework

## License

UNLICENSED
