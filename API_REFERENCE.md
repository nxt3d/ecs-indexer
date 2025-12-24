# ECS Indexer API Reference

Complete API documentation for the ECS Indexer - tracking the Ethereum Credential Service (ECS) protocol.

## Current Deployment Status

**🟢 LOCAL**: `http://localhost:42069`  
**🟢 PRODUCTION**: https://ecs-indexer.onrender.com

### Indexed Contracts (Sepolia Testnet)

| Contract | Address |
|----------|---------|
| **ECS Registry** | `0x1Cc0E6c3B645D7751DE7Ff7ce7d17cD228e4a4F2` |
| **ECS Registrar** | `0x86a67901820da1e3523Db67d02083C0a08170b37` |
| **Credential Resolver Factory** | `0xb5b31DEb61f6b9Dd61b222ad50084e11EF53B8E3` |
| **Start Block** | `9900600` (ECS deployed at block 9900685) |

### Architecture
- **🌐 Multi-Chain Ready**: Sepolia active, Mainnet ready
- **Database**: PGLite (Local development) / PostgreSQL (Production via Render)
- **Factory Pattern**: Dynamic discovery of CredentialResolver clones via factory events
- **Standards**: ERC-8049 (contract metadata), ENS Extended Resolvers
- **Node Version**: 18.17.0 (pinned for memory optimization)

### Key Features
- ✅ **Credential Tracking**: All registered labels (e.g., name-stars.ecs.eth)
- ✅ **Resolver Tracking**: All CredentialResolver clones deployed by the factory
- ✅ **ERC-8049 Metadata**: Contract-level metadata on resolvers
- ✅ **ENS Records**: Text records, addresses, contenthash on resolvers
- ✅ **Ownership History**: Credential and resolver ownership transfers
- ✅ **Renewal Tracking**: Credential expiration extensions

---

## Base URL

**Local Development:**
```
http://localhost:42069
```

**Production:**
```
https://ecs-indexer.onrender.com
```

**Status:** ✅ Live and operational

---

## Authentication

Most endpoints require API key authentication.

**Public endpoints** (no API key required):
- `GET /` - Root endpoint with API overview
- `GET /api/health` - Health check
- `GET /api/credentials/:chainId/:labelhash/metadata` - Credential metadata (public)
- `GET /api/resolvers/:chainId/:address/info` - Resolver info (public, mirrors getResolverInfo)

### Headers

```
Authorization: Bearer YOUR_API_KEY
```

### Example

```bash
# Authenticated request
curl -H "Authorization: Bearer sk-ecs-YOUR_KEY" \
  http://localhost:42069/api/credentials

# Public request (no auth needed)
curl http://localhost:42069/api/health
```

---

## Endpoints Overview

### Root

**GET /** 🔓 **PUBLIC**

Get API information and available endpoints.

**Response:**
```json
{
  "message": "ECS Indexer API",
  "version": "1.0.0",
  "description": "Indexer for the Ethereum Credential Service (ECS) protocol",
  "endpoints": {
    "GET /api/health": "Health check (public)",
    "GET /api/credentials": "List all registered credentials (labels)",
    "GET /api/credentials/:chainId/:labelhash": "Get credential by labelhash",
    "GET /api/credentials/:chainId/:labelhash/metadata": "Get credential metadata (public)",
    "GET /api/credentials/by-label/:label": "Get credential by label name",
    "GET /api/credentials/by-owner/:address": "Get credentials by owner",
    "GET /api/resolvers": "List all deployed credential resolvers",
    "GET /api/resolvers/:chainId/:address": "Get resolver details",
    "GET /api/resolvers/:chainId/:address/info": "Get resolver info (public) - getResolverInfo",
    "GET /api/resolvers/:chainId/:address/text": "Get all text records for a resolver",
    "GET /api/resolvers/:chainId/:address/metadata": "Get all ERC-8049 metadata for a resolver",
    "GET /api/stats": "Get global statistics"
  },
  "protocol": {
    "name": "Ethereum Credential Service (ECS)",
    "version": "0.2.2-beta",
    "documentation": "https://github.com/nxt3d/ecs"
  },
  "auth": "API key required (Bearer token) - except for endpoints marked (public)"
}
```

---

## Health Check

**GET /api/health** 🔓 **PUBLIC**

Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-12-24T02:00:00.000Z",
  "service": "ecs-indexer",
  "stats": {
    "credentials": 2,
    "resolvers": 2
  }
}
```

---

## Credentials (Registered Labels)

### List Credentials

**GET /api/credentials**

List all registered credentials (labels like `name-stars.ecs.eth`).

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (max: 100) |
| `offset` | number | 0 | Pagination offset |
| `chainId` | number | - | Filter by chain ID |
| `expired` | boolean | - | Filter by expiration status (`true`/`false`) |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/credentials?limit=10&chainId=11155111&expired=false"
```

**Response:**
```json
{
  "credentials": [
    {
      "labelhash": "0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057",
      "label": "name-stars",
      "fullName": "name-stars.ecs.eth",
      "chainId": 11155111,
      "chainName": "sepolia",
      "owner": "0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38",
      "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
      "resolverUpdatedAt": "1766518116",
      "review": null,
      "expiration": "1798054116",
      "isExpired": false,
      "registeredAt": {
        "block": "9900904",
        "timestamp": "1766518116",
        "txHash": "0x4ab9eaeac709e2b633d5751c5baec1111a1d33fa88d12a4242fe9f87a9bfa1e5"
      }
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 2
  },
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

### Get Credential by Labelhash

**GET /api/credentials/:chainId/:labelhash**

Get detailed information about a specific credential.

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `chainId` | Chain ID (e.g., `11155111` for Sepolia) |
| `labelhash` | Credential labelhash |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/credentials/11155111/0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057"
```

**Response:**
```json
{
  "labelhash": "0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057",
  "label": "name-stars",
  "fullName": "name-stars.ecs.eth",
  "chainId": 11155111,
  "chainName": "sepolia",
  "owner": "0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38",
  "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "resolverUpdatedAt": "1766518116",
  "review": null,
  "expiration": "1798054116",
  "isExpired": false,
  "registrationCost": null,
  "registeredAt": {
    "block": "9900904",
    "timestamp": "1766518116",
    "txHash": "0x4ab9eaeac709e2b633d5751c5baec1111a1d33fa88d12a4242fe9f87a9bfa1e5"
  },
  "transferHistory": [],
  "renewalHistory": [],
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

### Get Credential by Label

**GET /api/credentials/by-label/:label**

Get credential by human-readable label name.

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `label` | Label name (e.g., `name-stars`) |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `chainId` | number | Optional chain ID filter |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/credentials/by-label/name-stars?chainId=11155111"
```

**Response:**
```json
{
  "labelhash": "0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057",
  "label": "name-stars",
  "fullName": "name-stars.ecs.eth",
  "chainId": 11155111,
  "chainName": "sepolia",
  "owner": "0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38",
  "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "resolverUpdatedAt": "1766518116",
  "review": null,
  "expiration": "1798054116",
  "isExpired": false,
  "registeredAt": {
    "block": "9900904",
    "timestamp": "1766518116",
    "txHash": "0x4ab9eaeac709e2b633d5751c5baec1111a1d33fa88d12a4242fe9f87a9bfa1e5"
  },
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

### Get Credential Metadata

**GET /api/credentials/:chainId/:labelhash/metadata** 🔓 **PUBLIC**

Returns credential metadata including resolver metadata. This endpoint is **public** (no API key required).

**Response:**
```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8049#credential-v1",
  "label": "name-stars",
  "fullName": "name-stars.ecs.eth",
  "owner": "0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38",
  "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "review": null,
  "expiration": "1798054116",
  "expirationDate": "2026-12-23T22:35:16.000Z",
  "isExpired": false,
  "eth.ecs.name-stars.starts:vitalik.eth": "100"
}
```

---

### Get Credentials by Owner

**GET /api/credentials/by-owner/:address**

Get all credentials owned by a specific wallet address.

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `address` | Owner wallet address |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 100 | Max results (max: 1000) |
| `offset` | number | 0 | Pagination offset |
| `chainId` | number | - | Filter by chain ID |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/credentials/by-owner/0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38?chainId=11155111"
```

**Response:**
```json
{
  "owner": "0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38",
  "credentials": [
    {
      "labelhash": "0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057",
      "label": "name-stars",
      "fullName": "name-stars.ecs.eth",
      "chainId": 11155111,
      "chainName": "sepolia",
      "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
      "expiration": "1798054116",
      "isExpired": false,
      "registeredAt": {
        "block": "9900904",
        "timestamp": "1766518116"
      }
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 1
  },
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

## Resolvers (Smart Credentials)

### List Resolvers

**GET /api/resolvers**

List all deployed CredentialResolver clones.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 50 | Max results (max: 100) |
| `offset` | number | 0 | Pagination offset |
| `chainId` | number | - | Filter by chain ID |
| `owner` | string | - | Filter by owner address |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/resolvers?chainId=11155111&owner=0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38"
```

**Response:**
```json
{
  "resolvers": [
    {
      "address": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
      "chainId": 11155111,
      "chainName": "sepolia",
      "owner": "0xf8e03bd4436371e0e2f7c02e529b2172fe72b4ef",
      "labelhash": null,
      "label": null,
      "ethAddress": null,
      "contenthash": null,
      "deployedAt": {
        "block": "9900685",
        "timestamp": "1766515176",
        "txHash": "0xbd089612eba665759941bfdaaccc9292adad7c0f24d8721796fa213fdebaf69c"
      }
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 2
  },
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

### Get Resolver Details

**GET /api/resolvers/:chainId/:address**

Get detailed information about a specific resolver, including all text records, metadata, and address records.

**Parameters:**
| Parameter | Description |
|-----------|-------------|
| `chainId` | Chain ID |
| `address` | Resolver contract address |

**Example:**
```bash
curl -H "Authorization: Bearer $API_KEY" \
  "http://localhost:42069/api/resolvers/11155111/0x48a3d8cec7807edb1ba78878c356b3d051278891"
```

**Response:**
```json
{
  "address": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "chainId": 11155111,
  "chainName": "sepolia",
  "owner": "0xf8e03bd4436371e0e2f7c02e529b2172fe72b4ef",
  "labelhash": null,
  "label": null,
  "ethAddress": null,
  "contenthash": null,
  "deployedAt": {
    "block": "9900685",
    "timestamp": "1766515176",
    "txHash": "0xbd089612eba665759941bfdaaccc9292adad7c0f24d8721796fa213fdebaf69c"
  },
  "textRecords": {
    "indexed-key-522": "100"
  },
  "contractMetadata": {
    "eth.ecs.name-stars.starts:vitalik.eth": {
      "value": "0x0000000000000000000000000000000000000000000000000000000000000064",
      "decoded": "d"
    }
  },
  "addressRecords": {},
  "transferHistory": [],
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

### Get Resolver Info (Public)

**GET /api/resolvers/:chainId/:address/info** 🔓 **PUBLIC**

Returns resolver information matching the `getResolverInfo()` function from ECSRegistry. This endpoint is **public** (no API key required).

**Response:**
```json
{
  "label": "name-stars",
  "resolverUpdated": "1766518116",
  "review": ""
}
```

This matches the return value of `ECSRegistry.getResolverInfo(address)`:
- `label`: The human-readable label (e.g., "name-stars")
- `resolverUpdated`: Timestamp when resolver was last updated
- `review`: Admin review string (empty if not reviewed)

---

### Get Resolver Text Records

**GET /api/resolvers/:chainId/:address/text**

Get all ENS text records set on a resolver.

**Response:**
```json
{
  "resolverAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "chainId": 11155111,
  "textRecords": [
    {
      "key": "indexed-key-522",
      "value": "100",
      "setAt": {
        "block": "9900904",
        "timestamp": "1766518116",
        "txHash": "0x26a6a10bcd0925eb31a1321d8f0e9d39e23e1f859e78eb8b648ee1308ab84ad1"
      },
      "lastUpdate": {
        "block": "9900904",
        "timestamp": "1766518116"
      }
    }
  ],
  "total": 1,
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

**Note:** Text record keys are indexed in Solidity events, so the actual key name is hashed. The indexer stores them as `indexed-key-{logIndex}`. For production use, you may want to maintain a lookup table of known keys.

---

### Get Resolver ERC-8049 Metadata

**GET /api/resolvers/:chainId/:address/metadata**

Get all ERC-8049 contract-level metadata entries for a resolver.

**Response:**
```json
{
  "contractAddress": "0x48a3d8cec7807edb1ba78878c356b3d051278891",
  "chainId": 11155111,
  "metadata": [
    {
      "key": "eth.ecs.name-stars.starts:vitalik.eth",
      "value": "0x0000000000000000000000000000000000000000000000000000000000000064",
      "decoded": "d",
      "setAt": {
        "block": "9900904",
        "timestamp": "1766518116",
        "txHash": "0xcd64143ea949ba6a5631da1311237a7ccea8c6422144d76896537d7493c80feb"
      },
      "lastUpdate": {
        "block": "9900904",
        "timestamp": "1766518116"
      }
    }
  ],
  "total": 1,
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

## Statistics

### Get Global Stats

**GET /api/stats**

Get global statistics about the ECS ecosystem.

**Response:**
```json
{
  "credentials": {
    "total": 2,
    "active": 2,
    "expired": 0,
    "uniqueOwners": 2,
    "byChain": {
      "sepolia": 2
    }
  },
  "resolvers": {
    "total": 2,
    "uniqueOwners": 2,
    "byChain": {
      "sepolia": 2
    }
  },
  "metadata": {
    "totalContractMetadataEntries": 1,
    "totalTextRecords": 1
  },
  "timestamp": "2025-12-24T02:00:00.000Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid address format"
}
```

### 401 Unauthorized
```json
{
  "error": "Missing or invalid Authorization header"
}
```

### 404 Not Found
```json
{
  "error": "Credential not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch credentials",
  "details": "Error message"
}
```

---

## Data Types

| Type | Format | Example |
|------|--------|---------|
| Address | Lowercase hex (42 chars) | `0x48a3d8cec7807edb1ba78878c356b3d051278891` |
| Labelhash | Hex (66 chars) | `0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057` |
| Numbers (uint256) | String | `"1798054116"` |
| Timestamps | Unix seconds (string) | `"1766518116"` |
| Transaction Hash | Hex (66 chars) | `"0x4ab9eaeac709e2b633d5751c5baec1111a1d33fa88d12a4242fe9f87a9bfa1e5"` |
| Chain ID | Number | `11155111` |

---

## Event Types Indexed

### Factory Events
| Event | Description |
|-------|-------------|
| `ResolverCloneDeployed` | New CredentialResolver clone deployed |

### Registry Events
| Event | Description |
|-------|-------------|
| `NewLabelhashOwner` | New credential registration |
| `Transfer` | Credential ownership transferred |
| `ResolverChanged` | Resolver address updated for credential |
| `ResolverReviewUpdated` | Admin review updated |
| `ExpirationExtended` | Credential expiration extended |
| `ApprovalForAll` | Operator approval granted |

### Registrar Events
| Event | Description |
|-------|-------------|
| `NameRegistered` | Credential registration payment |
| `NameRenewed` | Credential renewal payment |

### Resolver Events (Smart Credentials)
| Event | Description |
|-------|-------------|
| `TextChanged` | ENS text record updated |
| `AddrChanged` | ETH address updated |
| `AddressChanged` | Multi-coin address updated |
| `ContenthashChanged` | Contenthash updated |
| `ContractMetadataUpdated` | ERC-8049 metadata updated |
| `OwnershipTransferred` | Resolver ownership transferred |

---

## Quick Start for dApp Integration

### 1. Set your API key

```javascript
const API_KEY = 'sk-ecs-YOUR_KEY';
const BASE_URL = 'http://localhost:42069';
// For production: const BASE_URL = 'https://ecs-indexer.onrender.com';

const headers = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
};
```

### 2. Fetch credentials

```javascript
const response = await fetch(`${BASE_URL}/api/credentials`, { headers });
const data = await response.json();
console.log(data.credentials);
```

### 3. Get credentials for a user

```javascript
const ownerAddress = '0x1804c8ab1f12e6bbf3894d4083f33e07309d1f38';
const response = await fetch(
  `${BASE_URL}/api/credentials/by-owner/${ownerAddress}`, 
  { headers }
);
const data = await response.json();
console.log(data.credentials);
```

### 4. Get resolver info (public, no auth)

```javascript
// Mirrors ECSRegistry.getResolverInfo() - no API key needed
const resolverAddress = '0x48a3d8cec7807edb1ba78878c356b3d051278891';
const chainId = 11155111;
const response = await fetch(
  `${BASE_URL}/api/resolvers/${chainId}/${resolverAddress}/info`
);
const info = await response.json();
console.log(info.label); // "name-stars"
console.log(info.resolverUpdated); // "1766518116"
console.log(info.review); // ""
```

### 5. Get credential metadata (public, no auth)

```javascript
const labelhash = '0xe4673c73d27fbd99f335c8537d9fb5f1e9901bb04156239fa61233f5b16e0057';
const chainId = 11155111;
const response = await fetch(
  `${BASE_URL}/api/credentials/${chainId}/${labelhash}/metadata`
);
const metadata = await response.json();
console.log(metadata.fullName); // "name-stars.ecs.eth"
console.log(metadata['eth.ecs.name-stars.starts:vitalik.eth']); // "100"
```

---

## Support

- **GitHub**: https://github.com/nxt3d/ecs-indexer
- **Production API**: https://ecs-indexer.onrender.com
- **ECS Protocol**: https://github.com/nxt3d/ecs
- **Local Logs**: Check terminal running `pnpm dev`
- **Production Logs**: Check Render dashboard → `ecs-indexer` → Logs
