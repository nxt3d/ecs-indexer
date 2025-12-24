import { onchainTable } from "ponder";

/* --- Smart Credentials (Registered Labels) --- */

// Track all registered labels (e.g., "name-stars" -> name-stars.ecs.eth)
export const credentials = onchainTable("credentials", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-labelhash"
  labelhash: t.hex().notNull(),
  chainId: t.integer().notNull(),
  chainName: t.text().notNull(),
  
  // Label info
  label: t.text(), // Human-readable label (e.g., "name-stars")
  fullName: t.text(), // Full ENS name (e.g., "name-stars.ecs.eth")
  
  // Ownership
  owner: t.hex().notNull(),
  
  // Resolver (Smart Credential address)
  resolverAddress: t.hex(),
  resolverUpdatedAt: t.bigint(),
  
  // Admin review
  review: t.text(),
  
  // Expiration
  expiration: t.bigint().notNull(),
  isExpired: t.boolean().notNull().default(false),
  
  // Registration info
  registrationCost: t.bigint(),
  
  // Timestamps
  registeredAtBlock: t.bigint().notNull(),
  registeredAtTimestamp: t.bigint().notNull(),
  registeredAtTxHash: t.hex().notNull(),
  
  // Last activity tracking
  lastUpdateBlock: t.bigint().notNull(),
  lastUpdateTimestamp: t.bigint().notNull(),
}));

/* --- Credential Resolvers (Factory-deployed clones) --- */

// Track all CredentialResolver clones deployed from the factory
export const resolvers = onchainTable("resolvers", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-resolverAddress"
  resolverAddress: t.hex().notNull(),
  chainId: t.integer().notNull(),
  chainName: t.text().notNull(),
  
  // Owner
  owner: t.hex().notNull(),
  
  // Associated credential label (if registered in ECS)
  labelhash: t.hex(),
  label: t.text(),
  
  // ENS resolver data
  ethAddress: t.hex(),
  contenthash: t.hex(),
  
  // Deployment info
  deployedAtBlock: t.bigint().notNull(),
  deployedAtTimestamp: t.bigint().notNull(),
  deployedAtTxHash: t.hex().notNull(),
  
  // Last activity tracking
  lastUpdateBlock: t.bigint().notNull(),
  lastUpdateTimestamp: t.bigint().notNull(),
}));

/* --- Text Records (ENS text() records on resolvers) --- */

// Track text records set on credential resolvers
export const textRecords = onchainTable("text_records", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-resolverAddress-key"
  resolverAddress: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  key: t.text().notNull(),
  value: t.text().notNull(),
  
  // Timestamps
  setAtBlock: t.bigint().notNull(),
  setAtTimestamp: t.bigint().notNull(),
  setAtTxHash: t.hex().notNull(),
  
  // Last update tracking
  lastUpdateBlock: t.bigint().notNull(),
  lastUpdateTimestamp: t.bigint().notNull(),
}));

/* --- Contract Metadata (ERC-8049) --- */

// Track ERC-8049 contract-level metadata on credential resolvers
export const contractMetadata = onchainTable("contract_metadata", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-contractAddress-key"
  contractAddress: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  key: t.text().notNull(),
  value: t.text().notNull(), // Store as hex string
  
  // Timestamps
  setAtBlock: t.bigint().notNull(),
  setAtTimestamp: t.bigint().notNull(),
  setAtTxHash: t.hex().notNull(),
  
  // Last update tracking
  lastUpdateBlock: t.bigint().notNull(),
  lastUpdateTimestamp: t.bigint().notNull(),
}));

/* --- Address Records (Multi-coin addresses on resolvers) --- */

// Track address records (addr()) set on credential resolvers
export const addressRecords = onchainTable("address_records", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-resolverAddress-coinType"
  resolverAddress: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  coinType: t.bigint().notNull(), // 60 = ETH, etc.
  address: t.text().notNull(), // Raw bytes as hex
  
  // Timestamps
  setAtBlock: t.bigint().notNull(),
  setAtTimestamp: t.bigint().notNull(),
  setAtTxHash: t.hex().notNull(),
  
  // Last update tracking
  lastUpdateBlock: t.bigint().notNull(),
  lastUpdateTimestamp: t.bigint().notNull(),
}));

/* --- Ownership Transfers --- */

// Track ownership transfers for credentials
export const credentialTransfers = onchainTable("credential_transfers", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-labelhash-blockNumber-logIndex"
  labelhash: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  newOwner: t.hex().notNull(),
  
  // Timestamps
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/* --- Resolver Ownership Transfers --- */

// Track ownership transfers for resolvers
export const resolverTransfers = onchainTable("resolver_transfers", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-resolverAddress-blockNumber-logIndex"
  resolverAddress: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  previousOwner: t.hex().notNull(),
  newOwner: t.hex().notNull(),
  
  // Timestamps
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/* --- Renewal History --- */

// Track renewal events for credentials
export const renewals = onchainTable("renewals", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-labelhash-blockNumber-logIndex"
  labelhash: t.hex().notNull(),
  chainId: t.integer().notNull(),
  
  label: t.text(),
  cost: t.bigint().notNull(),
  newExpiration: t.bigint().notNull(),
  
  // Timestamps
  blockNumber: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
  txHash: t.hex().notNull(),
}));

/* --- Approvals --- */

// Track approval-for-all settings
export const approvals = onchainTable("approvals", (t) => ({
  id: t.text().primaryKey(), // Format: "chainId-owner-operator"
  chainId: t.integer().notNull(),
  
  owner: t.hex().notNull(),
  operator: t.hex().notNull(),
  approved: t.boolean().notNull(),
  
  // Timestamps
  setAtBlock: t.bigint().notNull(),
  setAtTimestamp: t.bigint().notNull(),
  setAtTxHash: t.hex().notNull(),
}));
