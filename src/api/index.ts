import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "ponder:api";
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
} from "ponder:schema";

const app = new Hono();

/* --- CORS Configuration --- */

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use("/*", cors({
  origin: allowedOrigins,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}));

/* --- API Key Middleware --- */

const requireApiKey = async (c: any, next: any) => {
  // Skip auth for public endpoints
  if (c.req.path === '/' || c.req.path === '/api/health') {
    return next();
  }
  
  // Skip auth for public credential metadata endpoints
  if (c.req.path.match(/^\/api\/credentials\/[^\/]+\/[^\/]+\/metadata$/)) {
    return next();
  }
  
  // Skip auth for resolver info endpoint (commonly used)
  if (c.req.path.match(/^\/api\/resolvers\/[^\/]+\/[^\/]+\/info$/)) {
    return next();
  }
  
  const authHeader = c.req.header('Authorization');
  const expectedKey = process.env.API_KEY || 'sk-ecs-KutcvfDaPpNhJVUUEQuD2gvnI3E0udFbl7924VZRdt8';

  if (!expectedKey) {
    return c.json({ error: 'Server misconfiguration: API key not set' }, 500);
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const providedKey = authHeader.replace('Bearer ', '');
  if (providedKey !== expectedKey) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  return next();
};

app.use("/*", requireApiKey);

/* --- Public Endpoints --- */

app.get("/", (c) => {
  return c.json({ 
    message: "ECS Indexer API", 
    version: "1.0.0",
    description: "Indexer for the Ethereum Credential Service (ECS) protocol",
    endpoints: {
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
      "GET /api/stats": "Get global statistics",
    },
    protocol: {
      name: "Ethereum Credential Service (ECS)",
      version: "0.2.2-beta",
      documentation: "https://github.com/nxt3d/ecs",
    },
    auth: "API key required (Bearer token) - except for endpoints marked (public)",
  });
});

/* --- Health Check --- */

app.get("/api/health", async (c) => {
  try {
    const allCredentials = await db.select().from(credentials);
    const allResolvers = await db.select().from(resolvers);
    
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "ecs-indexer",
      stats: {
        credentials: allCredentials.length,
        resolvers: allResolvers.length,
      }
    });
  } catch (error) {
    return c.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "ecs-indexer",
    });
  }
});

/* --- Credentials (Registered Labels) --- */

app.get("/api/credentials", async (c) => {
  const chainId = c.req.query("chainId");
  const expired = c.req.query("expired");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    let allCredentials = await db.select().from(credentials);
    
    // Filter by chainId if provided
    if (chainId) {
      allCredentials = allCredentials.filter((c: any) => c.chainId === parseInt(chainId));
    }
    
    // Filter by expired status if provided
    if (expired !== undefined) {
      const isExpired = expired === 'true';
      allCredentials = allCredentials.filter((c: any) => c.isExpired === isExpired);
    }
    
    // Sort by registration time (newest first)
    allCredentials.sort((a: any, b: any) => 
      Number(b.registeredAtTimestamp) - Number(a.registeredAtTimestamp)
    );
    
    const total = allCredentials.length;
    const paginated = allCredentials.slice(offset, offset + limit);
    
    return c.json({
      credentials: paginated.map((cred: any) => ({
        labelhash: cred.labelhash,
        label: cred.label,
        fullName: cred.fullName,
        chainId: cred.chainId,
        chainName: cred.chainName,
        owner: cred.owner,
        resolverAddress: cred.resolverAddress,
        resolverUpdatedAt: cred.resolverUpdatedAt?.toString(),
        review: cred.review,
        expiration: cred.expiration.toString(),
        isExpired: cred.isExpired,
        registeredAt: {
          block: cred.registeredAtBlock.toString(),
          timestamp: cred.registeredAtTimestamp.toString(),
          txHash: cred.registeredAtTxHash,
        },
      })),
      pagination: { limit, offset, total },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch credentials", details: String(error) }, 500);
  }
});

// NOTE: Specific routes MUST come before generic :param routes

// Get credential by label name
app.get("/api/credentials/by-label/:label", async (c) => {
  const label = c.req.param("label").toLowerCase();
  const chainId = c.req.query("chainId") ? parseInt(c.req.query("chainId")!) : null;
  
  try {
    const allCredentials = await db.select().from(credentials);
    let cred = allCredentials.find((cr: any) => 
      cr.label?.toLowerCase() === label &&
      (chainId === null || cr.chainId === chainId)
    );
    
    if (!cred) {
      return c.json({ error: "Credential not found" }, 404);
    }
    
    return c.json({
      labelhash: cred.labelhash,
      label: cred.label,
      fullName: cred.fullName,
      chainId: cred.chainId,
      chainName: cred.chainName,
      owner: cred.owner,
      resolverAddress: cred.resolverAddress,
      resolverUpdatedAt: cred.resolverUpdatedAt?.toString(),
      review: cred.review,
      expiration: cred.expiration.toString(),
      isExpired: cred.isExpired,
      registeredAt: {
        block: cred.registeredAtBlock.toString(),
        timestamp: cred.registeredAtTimestamp.toString(),
        txHash: cred.registeredAtTxHash,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch credential", details: String(error) }, 500);
  }
});

// Get credentials by owner
app.get("/api/credentials/by-owner/:address", async (c) => {
  const ownerAddress = c.req.param("address").toLowerCase();
  const chainId = c.req.query("chainId");
  const limit = Math.min(parseInt(c.req.query("limit") || "100"), 1000);
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    let allCredentials = await db.select().from(credentials);
    
    // Filter by owner
    allCredentials = allCredentials.filter((cr: any) => 
      cr.owner.toLowerCase() === ownerAddress
    );
    
    // Filter by chainId if provided
    if (chainId) {
      allCredentials = allCredentials.filter((cr: any) => cr.chainId === parseInt(chainId));
    }
    
    // Sort by registration time (newest first)
    allCredentials.sort((a: any, b: any) => 
      Number(b.registeredAtTimestamp) - Number(a.registeredAtTimestamp)
    );
    
    const total = allCredentials.length;
    const paginated = allCredentials.slice(offset, offset + limit);
    
    return c.json({
      owner: ownerAddress,
      credentials: paginated.map((cred: any) => ({
        labelhash: cred.labelhash,
        label: cred.label,
        fullName: cred.fullName,
        chainId: cred.chainId,
        chainName: cred.chainName,
        resolverAddress: cred.resolverAddress,
        expiration: cred.expiration.toString(),
        isExpired: cred.isExpired,
        registeredAt: {
          block: cred.registeredAtBlock.toString(),
          timestamp: cred.registeredAtTimestamp.toString(),
        },
      })),
      pagination: { limit, offset, total },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch credentials", details: String(error) }, 500);
  }
});

// Generic route - MUST come after specific routes
app.get("/api/credentials/:chainId/:labelhash", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const labelhash = c.req.param("labelhash").toLowerCase();
  
  const credentialId = `${chainId}-${labelhash}`;
  
  try {
    const allCredentials = await db.select().from(credentials);
    const cred = allCredentials.find((c: any) => c.id === credentialId);
    
    if (!cred) {
      return c.json({ error: "Credential not found" }, 404);
    }
    
    // Get transfer history
    const allTransfers = await db.select().from(credentialTransfers);
    const transfers = allTransfers
      .filter((t: any) => 
        t.labelhash.toLowerCase() === labelhash &&
        t.chainId === chainId
      )
      .sort((a: any, b: any) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(0, 20);
    
    // Get renewal history
    const allRenewals = await db.select().from(renewals);
    const renewalHistory = allRenewals
      .filter((r: any) => 
        r.labelhash.toLowerCase() === labelhash &&
        r.chainId === chainId
      )
      .sort((a: any, b: any) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(0, 10);
    
    return c.json({
      labelhash: cred.labelhash,
      label: cred.label,
      fullName: cred.fullName,
      chainId: cred.chainId,
      chainName: cred.chainName,
      owner: cred.owner,
      resolverAddress: cred.resolverAddress,
      resolverUpdatedAt: cred.resolverUpdatedAt?.toString(),
      review: cred.review,
      expiration: cred.expiration.toString(),
      isExpired: cred.isExpired,
      registrationCost: cred.registrationCost?.toString(),
      registeredAt: {
        block: cred.registeredAtBlock.toString(),
        timestamp: cred.registeredAtTimestamp.toString(),
        txHash: cred.registeredAtTxHash,
      },
      transferHistory: transfers.map((t: any) => ({
        newOwner: t.newOwner,
        block: t.blockNumber.toString(),
        timestamp: t.timestamp.toString(),
        txHash: t.txHash,
      })),
      renewalHistory: renewalHistory.map((r: any) => ({
        cost: r.cost.toString(),
        newExpiration: r.newExpiration.toString(),
        block: r.blockNumber.toString(),
        timestamp: r.timestamp.toString(),
        txHash: r.txHash,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch credential", details: String(error) }, 500);
  }
});

// Public metadata endpoint for credential
app.get("/api/credentials/:chainId/:labelhash/metadata", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const labelhash = c.req.param("labelhash").toLowerCase();
  
  const credentialId = `${chainId}-${labelhash}`;
  
  try {
    const allCredentials = await db.select().from(credentials);
    const cred = allCredentials.find((c: any) => c.id === credentialId);
    
    if (!cred) {
      return c.json({ error: "Credential not found" }, 404);
    }
    
    // Get resolver metadata if available
    let resolverMetadata: Record<string, string> = {};
    if (cred.resolverAddress) {
      const allMetadata = await db.select().from(contractMetadata);
      const metadata = allMetadata.filter((m: any) => 
        m.contractAddress.toLowerCase() === cred.resolverAddress.toLowerCase() &&
        m.chainId === chainId
      );
      
      for (const m of metadata) {
        resolverMetadata[m.key] = tryDecodeHex(m.value);
      }
    }
    
    return c.json({
      type: "https://eips.ethereum.org/EIPS/eip-8049#credential-v1",
      label: cred.label,
      fullName: cred.fullName,
      owner: cred.owner,
      resolverAddress: cred.resolverAddress,
      review: cred.review,
      expiration: cred.expiration.toString(),
      expirationDate: new Date(Number(cred.expiration) * 1000).toISOString(),
      isExpired: cred.isExpired,
      ...resolverMetadata,
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch credential metadata", details: String(error) }, 500);
  }
});

/* --- Resolvers (Smart Credentials) --- */

app.get("/api/resolvers", async (c) => {
  const chainId = c.req.query("chainId");
  const owner = c.req.query("owner");
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    let allResolvers = await db.select().from(resolvers);
    
    // Filter by chainId if provided
    if (chainId) {
      allResolvers = allResolvers.filter((r: any) => r.chainId === parseInt(chainId));
    }
    
    // Filter by owner if provided
    if (owner) {
      allResolvers = allResolvers.filter((r: any) => 
        r.owner.toLowerCase() === owner.toLowerCase()
      );
    }
    
    // Sort by deployment time (newest first)
    allResolvers.sort((a: any, b: any) => 
      Number(b.deployedAtTimestamp) - Number(a.deployedAtTimestamp)
    );
    
    const total = allResolvers.length;
    const paginated = allResolvers.slice(offset, offset + limit);
    
    return c.json({
      resolvers: paginated.map((r: any) => ({
        address: r.resolverAddress,
        chainId: r.chainId,
        chainName: r.chainName,
        owner: r.owner,
        labelhash: r.labelhash,
        label: r.label,
        ethAddress: r.ethAddress,
        contenthash: r.contenthash,
        deployedAt: {
          block: r.deployedAtBlock.toString(),
          timestamp: r.deployedAtTimestamp.toString(),
          txHash: r.deployedAtTxHash,
        },
      })),
      pagination: { limit, offset, total },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch resolvers", details: String(error) }, 500);
  }
});

app.get("/api/resolvers/:chainId/:address", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const address = c.req.param("address").toLowerCase();
  
  const resolverId = `${chainId}-${address}`;
  
  try {
    const allResolvers = await db.select().from(resolvers);
    const resolver = allResolvers.find((r: any) => r.id === resolverId);
    
    if (!resolver) {
      return c.json({ error: "Resolver not found" }, 404);
    }
    
    // Get text records
    const allTextRecords = await db.select().from(textRecords);
    const texts = allTextRecords.filter((t: any) => 
      t.resolverAddress.toLowerCase() === address &&
      t.chainId === chainId
    );
    
    // Get contract metadata
    const allMetadata = await db.select().from(contractMetadata);
    const metadata = allMetadata.filter((m: any) => 
      m.contractAddress.toLowerCase() === address &&
      m.chainId === chainId
    );
    
    // Get address records
    const allAddresses = await db.select().from(addressRecords);
    const addresses = allAddresses.filter((a: any) => 
      a.resolverAddress.toLowerCase() === address &&
      a.chainId === chainId
    );
    
    // Get transfer history
    const allTransfers = await db.select().from(resolverTransfers);
    const transfers = allTransfers
      .filter((t: any) => 
        t.resolverAddress.toLowerCase() === address &&
        t.chainId === chainId
      )
      .sort((a: any, b: any) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(0, 20);
    
    return c.json({
      address: resolver.resolverAddress,
      chainId: resolver.chainId,
      chainName: resolver.chainName,
      owner: resolver.owner,
      labelhash: resolver.labelhash,
      label: resolver.label,
      ethAddress: resolver.ethAddress,
      contenthash: resolver.contenthash,
      deployedAt: {
        block: resolver.deployedAtBlock.toString(),
        timestamp: resolver.deployedAtTimestamp.toString(),
        txHash: resolver.deployedAtTxHash,
      },
      textRecords: texts.reduce((acc: any, t: any) => {
        acc[t.key] = t.value;
        return acc;
      }, {}),
      contractMetadata: metadata.reduce((acc: any, m: any) => {
        acc[m.key] = {
          value: m.value,
          decoded: tryDecodeHex(m.value),
        };
        return acc;
      }, {}),
      addressRecords: addresses.reduce((acc: any, a: any) => {
        acc[a.coinType.toString()] = a.address;
        return acc;
      }, {}),
      transferHistory: transfers.map((t: any) => ({
        previousOwner: t.previousOwner,
        newOwner: t.newOwner,
        block: t.blockNumber.toString(),
        timestamp: t.timestamp.toString(),
        txHash: t.txHash,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch resolver", details: String(error) }, 500);
  }
});

// Public endpoint - mirrors getResolverInfo from ECSRegistry
app.get("/api/resolvers/:chainId/:address/info", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const address = c.req.param("address").toLowerCase();
  
  const resolverId = `${chainId}-${address}`;
  
  try {
    const allResolvers = await db.select().from(resolvers);
    const resolver = allResolvers.find((r: any) => r.id === resolverId);
    
    if (!resolver) {
      // Try to find the credential that has this resolver
      const allCredentials = await db.select().from(credentials);
      const cred = allCredentials.find((c: any) => 
        c.resolverAddress?.toLowerCase() === address &&
        c.chainId === chainId
      );
      
      if (cred) {
        return c.json({
          label: cred.label || "",
          resolverUpdated: cred.resolverUpdatedAt?.toString() || "0",
          review: cred.review || "",
        });
      }
      
      return c.json({
        label: "",
        resolverUpdated: "0",
        review: "",
      });
    }
    
    // Find the credential associated with this resolver
    const allCredentials = await db.select().from(credentials);
    const cred = allCredentials.find((c: any) => 
      c.resolverAddress?.toLowerCase() === address &&
      c.chainId === chainId
    );
    
    return c.json({
      label: cred?.label || resolver.label || "",
      resolverUpdated: cred?.resolverUpdatedAt?.toString() || "0",
      review: cred?.review || "",
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch resolver info", details: String(error) }, 500);
  }
});

// Get all text records for a resolver
app.get("/api/resolvers/:chainId/:address/text", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const address = c.req.param("address").toLowerCase();
  
  try {
    const allTextRecords = await db.select().from(textRecords);
    const texts = allTextRecords.filter((t: any) => 
      t.resolverAddress.toLowerCase() === address &&
      t.chainId === chainId
    );
    
    return c.json({
      resolverAddress: address,
      chainId,
      textRecords: texts.map((t: any) => ({
        key: t.key,
        value: t.value,
        setAt: {
          block: t.setAtBlock.toString(),
          timestamp: t.setAtTimestamp.toString(),
          txHash: t.setAtTxHash,
        },
        lastUpdate: {
          block: t.lastUpdateBlock.toString(),
          timestamp: t.lastUpdateTimestamp.toString(),
        },
      })),
      total: texts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch text records", details: String(error) }, 500);
  }
});

// Get all ERC-8049 metadata for a resolver
app.get("/api/resolvers/:chainId/:address/metadata", async (c) => {
  const chainId = parseInt(c.req.param("chainId"));
  const address = c.req.param("address").toLowerCase();
  
  try {
    const allMetadata = await db.select().from(contractMetadata);
    const metadata = allMetadata.filter((m: any) => 
      m.contractAddress.toLowerCase() === address &&
      m.chainId === chainId
    );
    
    return c.json({
      contractAddress: address,
      chainId,
      metadata: metadata.map((m: any) => ({
        key: m.key,
        value: m.value,
        decoded: tryDecodeHex(m.value),
        setAt: {
          block: m.setAtBlock.toString(),
          timestamp: m.setAtTimestamp.toString(),
          txHash: m.setAtTxHash,
        },
        lastUpdate: {
          block: m.lastUpdateBlock.toString(),
          timestamp: m.lastUpdateTimestamp.toString(),
        },
      })),
      total: metadata.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch contract metadata", details: String(error) }, 500);
  }
});

/* --- Statistics --- */

app.get("/api/stats", async (c) => {
  try {
    const allCredentials = await db.select().from(credentials);
    const allResolvers = await db.select().from(resolvers);
    const allMetadata = await db.select().from(contractMetadata);
    const allTextRecords = await db.select().from(textRecords);
    
    // Calculate stats
    const totalCredentials = allCredentials.length;
    const expiredCredentials = allCredentials.filter((c: any) => c.isExpired).length;
    const activeCredentials = totalCredentials - expiredCredentials;
    const uniqueOwners = new Set(allCredentials.map((c: any) => c.owner.toLowerCase())).size;
    
    const totalResolvers = allResolvers.length;
    const uniqueResolverOwners = new Set(allResolvers.map((r: any) => r.owner.toLowerCase())).size;
    
    return c.json({
      credentials: {
        total: totalCredentials,
        active: activeCredentials,
        expired: expiredCredentials,
        uniqueOwners,
        byChain: groupByChain(allCredentials),
      },
      resolvers: {
        total: totalResolvers,
        uniqueOwners: uniqueResolverOwners,
        byChain: groupByChain(allResolvers),
      },
      metadata: {
        totalContractMetadataEntries: allMetadata.length,
        totalTextRecords: allTextRecords.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Failed to fetch stats", details: String(error) }, 500);
  }
});

/* --- Helper Functions --- */

function tryDecodeHex(hex: string): string {
  if (!hex || !hex.startsWith('0x')) return hex;
  try {
    const bytes = Buffer.from(hex.slice(2), 'hex');
    // Check if it looks like valid UTF-8 text
    const decoded = bytes.toString('utf8').replace(/\0/g, '');
    // If the decoded string has mostly printable characters, return it
    const printableRatio = decoded.split('').filter(c => c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 127).length / decoded.length;
    if (printableRatio > 0.8 || decoded.length === 0) {
      return decoded;
    }
    return hex;
  } catch {
    return hex;
  }
}

function groupByChain(items: any[]): Record<string, number> {
  return items.reduce((acc: any, item: any) => {
    const chain = item.chainName || 'unknown';
    acc[chain] = (acc[chain] || 0) + 1;
    return acc;
  }, {});
}

// Export the app
export default app;
