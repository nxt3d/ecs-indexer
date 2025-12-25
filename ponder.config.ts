import { createConfig } from "ponder";

import { ECSRegistryAbi } from "./abis/ECSRegistryAbi";
import { ECSRegistrarAbi } from "./abis/ECSRegistrarAbi";
import { CredentialResolverFactoryAbi } from "./abis/CredentialResolverFactoryAbi";
import { CredentialResolverAbi } from "./abis/CredentialResolverAbi";
import { ERC8048Abi } from "./abis/ERC8048Abi";
import { ERCXXXXReviewsAbi } from "./abis/ERCXXXXReviewsAbi";

/* --- Chain Configuration --- */

const CHAIN_IDS = {
  sepolia: 11155111,
  mainnet: 1,
} as const;

// Build chains config - only include chains with RPC URLs explicitly set
const chainsConfig: Record<string, { id: number; rpc: string }> = {};
for (const [chain, chainId] of Object.entries(CHAIN_IDS)) {
  const envVarName = `PONDER_RPC_URL_${chainId}`;
  if (process.env[envVarName]) {
    chainsConfig[chain] = {
      id: chainId,
      rpc: process.env[envVarName],
    };
  }
}

/* --- Contract Addresses --- */

// Sepolia deployment (December 23, 2025)
const SEPOLIA_ECS_REGISTRY = "0x1Cc0E6c3B645D7751DE7Ff7ce7d17cD228e4a4F2";
const SEPOLIA_ECS_REGISTRAR = "0x86a67901820da1e3523Db67d02083C0a08170b37";
const SEPOLIA_FACTORY = "0xb5b31DEb61f6b9Dd61b222ad50084e11EF53B8E3";

// Start block for Sepolia deployment (ECS deployed at block 9900685)
const SEPOLIA_START_BLOCK = parseInt(
  process.env.SEPOLIA_START_BLOCK || "9900600",
  10
);

export default createConfig({
  // Database configuration
  database: process.env.DATABASE_URL 
    ? { 
        kind: "postgres",
        connectionString: process.env.DATABASE_URL,
      }
    : {
        kind: "pglite", // Local development
      },

  // Chain configurations
  chains: chainsConfig,

  contracts: {
    /* --- ECS Registry --- */
    ECSRegistry_Sepolia: {
      abi: ECSRegistryAbi,
      address: SEPOLIA_ECS_REGISTRY as `0x${string}`,
      chain: "sepolia",
      startBlock: SEPOLIA_START_BLOCK,
    },

    /* --- ECS Registrar --- */
    ECSRegistrar_Sepolia: {
      abi: ECSRegistrarAbi,
      address: SEPOLIA_ECS_REGISTRAR as `0x${string}`,
      chain: "sepolia",
      startBlock: SEPOLIA_START_BLOCK,
    },

    /* --- Credential Resolver Factory --- */
    CredentialResolverFactory_Sepolia: {
      abi: CredentialResolverFactoryAbi,
      address: SEPOLIA_FACTORY as `0x${string}`,
      chain: "sepolia",
      startBlock: SEPOLIA_START_BLOCK,
    },

    /* --- Credential Resolvers (Smart Credentials) - Dynamically discovered from factory --- */
    CredentialResolver_Sepolia: {
      abi: [...CredentialResolverAbi, ...ERC8048Abi, ...ERCXXXXReviewsAbi] as const,
      chain: "sepolia",
      factory: {
        address: SEPOLIA_FACTORY as `0x${string}`,
        event: CredentialResolverFactoryAbi.find(
          (item) => item.type === "event" && item.name === "ResolverCloneDeployed"
        )!,
        parameter: "clone",
      },
      startBlock: SEPOLIA_START_BLOCK,
    },

    /* --- Custom Resolvers - Dynamically discovered from ECS Registry ResolverChanged events --- */
    /* This picks up custom resolvers (not factory-deployed) that are registered via ResolverChanged */
    CustomResolver_Sepolia: {
      abi: [...ERC8048Abi, ...ERCXXXXReviewsAbi] as const,
      chain: "sepolia",
      factory: {
        address: SEPOLIA_ECS_REGISTRY as `0x${string}`,
        event: ECSRegistryAbi.find(
          (item) => item.type === "event" && item.name === "ResolverChanged"
        )!,
        parameter: "resolver",
      },
      startBlock: SEPOLIA_START_BLOCK,
    },
  },
});
