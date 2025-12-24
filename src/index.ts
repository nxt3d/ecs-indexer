import { ponder } from "ponder:registry";
import { 
  credentials,
  resolvers,
  textRecords,
  contractMetadata,
  addressRecords,
  credentialTransfers,
  resolverTransfers,
  renewals,
  approvals
} from "../ponder.schema";

/* --- Chain Helper --- */

const CHAIN_IDS: Record<string, number> = {
  sepolia: 11155111,
  mainnet: 1,
};

function getChainInfo(handlerName?: string): { chainId: number; chainName: string } {
  let chainName = "sepolia"; // default
  
  if (handlerName?.includes("_Mainnet")) {
    chainName = "mainnet";
  } else if (handlerName?.includes("_Sepolia")) {
    chainName = "sepolia";
  }
  
  const chainId = CHAIN_IDS[chainName] || CHAIN_IDS.sepolia;
  
  return { chainId, chainName };
}

/* --- Validation Helpers --- */

// Check if a resolver address is known (deployed by our factory)
async function isKnownResolver(context: any, chainId: number, address: string): Promise<boolean> {
  const resolverId = `${chainId}-${address.toLowerCase()}`;
  const resolver = await context.db.find(resolvers, { id: resolverId });
  return resolver !== null;
}

/* ================================================================
   ECS REGISTRY EVENT HANDLERS
   ================================================================ */

// Handle new label registration (NewLabelhashOwner)
ponder.on("ECSRegistry_Sepolia:NewLabelhashOwner", async ({ event, context }) => {
  const { labelhash, owner } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const credentialId = `${chainId}-${labelhash}`;
  
  try {
    // Try to get the label from the registry
    let label: string | null = null;
    try {
      label = await context.client.readContract({
        abi: context.contracts.ECSRegistry_Sepolia.abi,
        address: event.log.address as `0x${string}`,
        functionName: "getLabel",
        args: [labelhash],
      }) as string;
    } catch (e) {
      console.log(`Could not fetch label for ${labelhash}`);
    }
    
    // Try to get expiration
    let expiration = 0n;
    try {
      expiration = await context.client.readContract({
        abi: context.contracts.ECSRegistry_Sepolia.abi,
        address: event.log.address as `0x${string}`,
        functionName: "getExpiration",
        args: [labelhash],
      }) as bigint;
    } catch (e) {
      console.log(`Could not fetch expiration for ${labelhash}`);
    }
    
    // Try to get resolver
    let resolverAddress: `0x${string}` | null = null;
    try {
      resolverAddress = await context.client.readContract({
        abi: context.contracts.ECSRegistry_Sepolia.abi,
        address: event.log.address as `0x${string}`,
        functionName: "resolver",
        args: [labelhash],
      }) as `0x${string}`;
      if (resolverAddress === "0x0000000000000000000000000000000000000000") {
        resolverAddress = null;
      }
    } catch (e) {
      console.log(`Could not fetch resolver for ${labelhash}`);
    }
    
    const fullName = label ? `${label}.ecs.eth` : null;
    
    await context.db.insert(credentials).values({
      id: credentialId,
      labelhash: labelhash as `0x${string}`,
      chainId,
      chainName,
      label,
      fullName,
      owner: owner.toLowerCase() as `0x${string}`,
      resolverAddress: resolverAddress?.toLowerCase() as `0x${string}` | undefined,
      resolverUpdatedAt: event.block.timestamp,
      review: null,
      expiration,
      isExpired: expiration > 0n && BigInt(event.block.timestamp) > expiration,
      registrationCost: null,
      registeredAtBlock: event.block.number,
      registeredAtTimestamp: event.block.timestamp,
      registeredAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoUpdate((row) => ({
      label: label || row.label,
      fullName: fullName || row.fullName,
      owner: owner.toLowerCase() as `0x${string}`,
      resolverAddress: resolverAddress?.toLowerCase() as `0x${string}` | undefined,
      resolverUpdatedAt: event.block.timestamp,
      expiration,
      isExpired: expiration > 0n && BigInt(event.block.timestamp) > expiration,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }));
    
    console.log(`✅ Credential registered: ${label || labelhash} owned by ${owner}`);
  } catch (error) {
    console.error(`❌ Failed to index credential ${labelhash}:`, error);
  }
});

// Handle ownership transfers
ponder.on("ECSRegistry_Sepolia:Transfer", async ({ event, context }) => {
  const { labelhash, owner } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const credentialId = `${chainId}-${labelhash}`;
  const transferId = `${chainId}-${labelhash}-${event.block.number}-${event.log.logIndex}`;
  
  try {
    // Record the transfer
    await context.db.insert(credentialTransfers).values({
      id: transferId,
      labelhash: labelhash as `0x${string}`,
      chainId,
      newOwner: owner.toLowerCase() as `0x${string}`,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    }).onConflictDoNothing();
    
    // Update credential owner
    await context.db
      .update(credentials, { id: credentialId })
      .set({
        owner: owner.toLowerCase() as `0x${string}`,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    console.log(`🔄 Credential ${labelhash} transferred to ${owner}`);
  } catch (error) {
    // Credential might not exist yet
  }
});

// Handle resolver changes
ponder.on("ECSRegistry_Sepolia:ResolverChanged", async ({ event, context }) => {
  const { labelhash, resolver } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const credentialId = `${chainId}-${labelhash}`;
  const resolverAddr = resolver === "0x0000000000000000000000000000000000000000" ? null : resolver.toLowerCase();
  
  try {
    await context.db
      .update(credentials, { id: credentialId })
      .set({
        resolverAddress: resolverAddr as `0x${string}` | undefined,
        resolverUpdatedAt: event.block.timestamp,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    // Also update the resolver's labelhash if it's a known resolver
    if (resolverAddr) {
      const resolverId = `${chainId}-${resolverAddr}`;
      const existingResolver = await context.db.find(resolvers, { id: resolverId });
      
      if (existingResolver) {
        // Get label
        let label: string | null = null;
        try {
          label = await context.client.readContract({
            abi: context.contracts.ECSRegistry_Sepolia.abi,
            address: event.log.address as `0x${string}`,
            functionName: "getLabel",
            args: [labelhash],
          }) as string;
        } catch (e) {}
        
        await context.db
          .update(resolvers, { id: resolverId })
          .set({
            labelhash: labelhash as `0x${string}`,
            label,
            lastUpdateBlock: event.block.number,
            lastUpdateTimestamp: event.block.timestamp,
          });
      }
    }
    
    console.log(`🔗 Resolver changed for ${labelhash} to ${resolver}`);
  } catch (error) {
    console.error(`❌ Failed to update resolver for ${labelhash}:`, error);
  }
});

// Handle resolver review updates
ponder.on("ECSRegistry_Sepolia:ResolverReviewUpdated", async ({ event, context }) => {
  const { labelhash, review } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const credentialId = `${chainId}-${labelhash}`;
  
  try {
    await context.db
      .update(credentials, { id: credentialId })
      .set({
        review,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    console.log(`📝 Review updated for ${labelhash}: ${review}`);
  } catch (error) {
    console.error(`❌ Failed to update review for ${labelhash}:`, error);
  }
});

// Handle expiration extensions
ponder.on("ECSRegistry_Sepolia:ExpirationExtended", async ({ event, context }) => {
  const { labelhash, newExpiration } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const credentialId = `${chainId}-${labelhash}`;
  
  try {
    await context.db
      .update(credentials, { id: credentialId })
      .set({
        expiration: newExpiration,
        isExpired: false,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    console.log(`⏰ Expiration extended for ${labelhash} to ${newExpiration}`);
  } catch (error) {
    console.error(`❌ Failed to extend expiration for ${labelhash}:`, error);
  }
});

// Handle approval-for-all
ponder.on("ECSRegistry_Sepolia:ApprovalForAll", async ({ event, context }) => {
  const { owner, operator, approved } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistry_Sepolia");
  
  const approvalId = `${chainId}-${owner.toLowerCase()}-${operator.toLowerCase()}`;
  
  try {
    await context.db.insert(approvals).values({
      id: approvalId,
      chainId,
      owner: owner.toLowerCase() as `0x${string}`,
      operator: operator.toLowerCase() as `0x${string}`,
      approved,
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
    }).onConflictDoUpdate(() => ({
      approved,
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
    }));
    
    console.log(`✅ Approval ${approved ? 'granted' : 'revoked'}: ${owner} -> ${operator}`);
  } catch (error) {
    console.error(`❌ Failed to update approval:`, error);
  }
});

/* ================================================================
   ECS REGISTRAR EVENT HANDLERS
   ================================================================ */

// Handle name registration
ponder.on("ECSRegistrar_Sepolia:NameRegistered", async ({ event, context }) => {
  const { owner, cost, expires } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistrar_Sepolia");
  
  // The label is indexed so we can't get it directly, but we can compute the labelhash
  // and update the existing credential record with the cost
  // Note: The NewLabelhashOwner event from the registry will have already created the record
  
  console.log(`🎉 Name registered: owner=${owner}, cost=${cost}, expires=${expires}`);
});

// Handle name renewal
ponder.on("ECSRegistrar_Sepolia:NameRenewed", async ({ event, context }) => {
  const { cost, newExpiration } = event.args;
  const { chainId, chainName } = getChainInfo("ECSRegistrar_Sepolia");
  
  // Record renewal event - note: label is indexed so we track by tx
  const renewalId = `${chainId}-${event.transaction.hash}-${event.log.logIndex}`;
  
  try {
    await context.db.insert(renewals).values({
      id: renewalId,
      labelhash: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, // Unknown from indexed event
      chainId,
      label: null,
      cost,
      newExpiration,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    }).onConflictDoNothing();
    
    console.log(`🔄 Name renewed: cost=${cost}, newExpiration=${newExpiration}`);
  } catch (error) {
    console.error(`❌ Failed to record renewal:`, error);
  }
});

/* ================================================================
   CREDENTIAL RESOLVER FACTORY EVENT HANDLERS
   ================================================================ */

// Handle new resolver clone deployment
ponder.on("CredentialResolverFactory_Sepolia:ResolverCloneDeployed", async ({ event, context }) => {
  const { clone, owner } = event.args;
  const { chainId, chainName } = getChainInfo("CredentialResolverFactory_Sepolia");
  
  const resolverId = `${chainId}-${clone.toLowerCase()}`;
  
  try {
    await context.db.insert(resolvers).values({
      id: resolverId,
      resolverAddress: clone.toLowerCase() as `0x${string}`,
      chainId,
      chainName,
      owner: owner.toLowerCase() as `0x${string}`,
      labelhash: null,
      label: null,
      ethAddress: null,
      contenthash: null,
      deployedAtBlock: event.block.number,
      deployedAtTimestamp: event.block.timestamp,
      deployedAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoNothing();
    
    console.log(`✅ Resolver clone deployed: ${clone} owned by ${owner}`);
  } catch (error) {
    console.error(`❌ Failed to index resolver ${clone}:`, error);
  }
});

/* ================================================================
   CREDENTIAL RESOLVER EVENT HANDLERS
   ================================================================ */

// Handle text record changes
ponder.on("CredentialResolver_Sepolia:TextChanged", async ({ event, context }) => {
  const { value } = event.args;
  const resolverAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, resolverAddress))) {
    return;
  }
  
  // Note: key is indexed so we need to extract it from the topic
  // For simplicity, we'll use the transaction hash + log index as a unique key
  const key = `indexed-key-${event.log.logIndex}`;
  const recordId = `${chainId}-${resolverAddress.toLowerCase()}-${key}`;
  
  try {
    await context.db.insert(textRecords).values({
      id: recordId,
      resolverAddress: resolverAddress.toLowerCase() as `0x${string}`,
      chainId,
      key,
      value,
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoUpdate(() => ({
      value,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }));
    
    console.log(`📝 Text record set on ${resolverAddress}: ${key} = ${value.substring(0, 50)}...`);
  } catch (error) {
    console.error(`❌ Failed to store text record:`, error);
  }
});

// Handle ETH address changes
ponder.on("CredentialResolver_Sepolia:AddrChanged", async ({ event, context }) => {
  const { a } = event.args;
  const resolverAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, resolverAddress))) {
    return;
  }
  
  const resolverId = `${chainId}-${resolverAddress.toLowerCase()}`;
  const coinType = 60n; // ETH
  const recordId = `${chainId}-${resolverAddress.toLowerCase()}-${coinType}`;
  
  try {
    // Update resolver's ETH address
    await context.db
      .update(resolvers, { id: resolverId })
      .set({
        ethAddress: a.toLowerCase() as `0x${string}`,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    // Also store in address records
    await context.db.insert(addressRecords).values({
      id: recordId,
      resolverAddress: resolverAddress.toLowerCase() as `0x${string}`,
      chainId,
      coinType,
      address: a.toLowerCase(),
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoUpdate(() => ({
      address: a.toLowerCase(),
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }));
    
    console.log(`📍 ETH address set on ${resolverAddress}: ${a}`);
  } catch (error) {
    console.error(`❌ Failed to store ETH address:`, error);
  }
});

// Handle multi-coin address changes
ponder.on("CredentialResolver_Sepolia:AddressChanged", async ({ event, context }) => {
  const { coinType, newAddress } = event.args;
  const resolverAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, resolverAddress))) {
    return;
  }
  
  const recordId = `${chainId}-${resolverAddress.toLowerCase()}-${coinType}`;
  const addressHex = typeof newAddress === 'string' ? newAddress : `0x${Buffer.from(newAddress).toString('hex')}`;
  
  try {
    await context.db.insert(addressRecords).values({
      id: recordId,
      resolverAddress: resolverAddress.toLowerCase() as `0x${string}`,
      chainId,
      coinType,
      address: addressHex,
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoUpdate(() => ({
      address: addressHex,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }));
    
    // If it's ETH (coinType 60), also update the resolver's ethAddress
    if (coinType === 60n) {
      const resolverId = `${chainId}-${resolverAddress.toLowerCase()}`;
      await context.db
        .update(resolvers, { id: resolverId })
        .set({
          ethAddress: addressHex as `0x${string}`,
          lastUpdateBlock: event.block.number,
          lastUpdateTimestamp: event.block.timestamp,
        });
    }
    
    console.log(`📍 Address set on ${resolverAddress} for coinType ${coinType}`);
  } catch (error) {
    console.error(`❌ Failed to store address:`, error);
  }
});

// Handle contenthash changes
ponder.on("CredentialResolver_Sepolia:ContenthashChanged", async ({ event, context }) => {
  const { hash } = event.args;
  const resolverAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, resolverAddress))) {
    return;
  }
  
  const resolverId = `${chainId}-${resolverAddress.toLowerCase()}`;
  const hashHex = typeof hash === 'string' ? hash : `0x${Buffer.from(hash).toString('hex')}`;
  
  try {
    await context.db
      .update(resolvers, { id: resolverId })
      .set({
        contenthash: hashHex as `0x${string}`,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    console.log(`🔗 Contenthash set on ${resolverAddress}`);
  } catch (error) {
    console.error(`❌ Failed to store contenthash:`, error);
  }
});

// Handle ERC-8049 contract metadata updates
ponder.on("CredentialResolver_Sepolia:ContractMetadataUpdated", async ({ event, context }) => {
  const { key, value } = event.args;
  const contractAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, contractAddress))) {
    return;
  }
  
  const metadataId = `${chainId}-${contractAddress.toLowerCase()}-${key}`;
  const hexValue = typeof value === 'string' ? value : `0x${Buffer.from(value).toString('hex')}`;
  
  try {
    await context.db.insert(contractMetadata).values({
      id: metadataId,
      contractAddress: contractAddress.toLowerCase() as `0x${string}`,
      chainId,
      key,
      value: hexValue,
      setAtBlock: event.block.number,
      setAtTimestamp: event.block.timestamp,
      setAtTxHash: event.transaction.hash,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }).onConflictDoUpdate(() => ({
      value: hexValue,
      lastUpdateBlock: event.block.number,
      lastUpdateTimestamp: event.block.timestamp,
    }));
    
    console.log(`📋 Contract metadata set on ${contractAddress}: ${key}`);
  } catch (error) {
    console.error(`❌ Failed to store contract metadata:`, error);
  }
});

// Handle resolver ownership transfers
ponder.on("CredentialResolver_Sepolia:OwnershipTransferred", async ({ event, context }) => {
  const { previousOwner, newOwner } = event.args;
  const resolverAddress = event.log.address;
  const { chainId, chainName } = getChainInfo("CredentialResolver_Sepolia");
  
  // Skip if not a factory-deployed resolver
  if (!(await isKnownResolver(context, chainId, resolverAddress))) {
    return;
  }
  
  const resolverId = `${chainId}-${resolverAddress.toLowerCase()}`;
  const transferId = `${chainId}-${resolverAddress.toLowerCase()}-${event.block.number}-${event.log.logIndex}`;
  
  try {
    // Record the transfer
    await context.db.insert(resolverTransfers).values({
      id: transferId,
      resolverAddress: resolverAddress.toLowerCase() as `0x${string}`,
      chainId,
      previousOwner: previousOwner.toLowerCase() as `0x${string}`,
      newOwner: newOwner.toLowerCase() as `0x${string}`,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      txHash: event.transaction.hash,
    }).onConflictDoNothing();
    
    // Update resolver owner
    await context.db
      .update(resolvers, { id: resolverId })
      .set({
        owner: newOwner.toLowerCase() as `0x${string}`,
        lastUpdateBlock: event.block.number,
        lastUpdateTimestamp: event.block.timestamp,
      });
    
    console.log(`🔄 Resolver ${resolverAddress} ownership transferred: ${previousOwner} -> ${newOwner}`);
  } catch (error) {
    console.error(`❌ Failed to transfer resolver ownership:`, error);
  }
});
