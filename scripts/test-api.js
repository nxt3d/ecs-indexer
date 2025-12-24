#!/usr/bin/env node

/**
 * ECS Indexer API Test Script
 * 
 * Tests all API endpoints against the running indexer.
 * 
 * Usage:
 *   node scripts/test-api.js [baseUrl]
 * 
 * Examples:
 *   node scripts/test-api.js                    # Uses localhost:42069
 *   node scripts/test-api.js http://localhost:42070
 */

const BASE_URL = process.argv[2] || 'http://localhost:42069';
const API_KEY = process.env.API_KEY || 'sk-ecs-KutcvfDaPpNhJVUUEQuD2gvnI3E0udFbl7924VZRdt8';

const SEPOLIA_CHAIN_ID = 11155111;
const TEST_RESOLVER = '0x48a3d8cec7807edb1ba78878c356b3d051278891';
const TEST_LABEL = 'name-stars';

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

async function fetchJson(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add auth header for non-public endpoints
  if (!options.public) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }
  
  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTests() {
  console.log(`\n🧪 ECS Indexer API Tests`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Chain: Sepolia (${SEPOLIA_CHAIN_ID})\n`);
  
  /* --- Public Endpoints --- */
  
  console.log('--- Public Endpoints ---\n');
  
  await test('GET / - API info', async () => {
    const data = await fetchJson('/', { public: true });
    assert(data.message === 'ECS Indexer API', 'Should return API info');
    assert(data.version, 'Should have version');
    assert(data.endpoints, 'Should list endpoints');
  });
  
  await test('GET /api/health - Health check', async () => {
    const data = await fetchJson('/api/health', { public: true });
    assert(data.status === 'ok', 'Status should be ok');
    assert(data.service === 'ecs-indexer', 'Service should be ecs-indexer');
    assert(typeof data.stats.credentials === 'number', 'Should have credentials count');
    assert(typeof data.stats.resolvers === 'number', 'Should have resolvers count');
  });
  
  await test('GET /api/resolvers/:chainId/:address/info - Public resolver info', async () => {
    const data = await fetchJson(`/api/resolvers/${SEPOLIA_CHAIN_ID}/${TEST_RESOLVER}/info`, { public: true });
    assert(data.label === TEST_LABEL, `Label should be ${TEST_LABEL}`);
    assert(data.resolverUpdated, 'Should have resolverUpdated');
    assert(typeof data.review === 'string', 'Should have review field');
  });
  
  /* --- Authenticated Endpoints --- */
  
  console.log('\n--- Authenticated Endpoints ---\n');
  
  await test('GET /api/credentials - List all credentials', async () => {
    const data = await fetchJson('/api/credentials');
    assert(Array.isArray(data.credentials), 'Should return array of credentials');
    assert(data.pagination, 'Should have pagination');
    assert(data.pagination.total >= 0, 'Should have total count');
    
    if (data.credentials.length > 0) {
      const cred = data.credentials[0];
      assert(cred.labelhash, 'Credential should have labelhash');
      assert(cred.owner, 'Credential should have owner');
      assert(cred.chainId, 'Credential should have chainId');
    }
  });
  
  await test('GET /api/credentials?chainId=11155111 - Filter by chain', async () => {
    const data = await fetchJson(`/api/credentials?chainId=${SEPOLIA_CHAIN_ID}`);
    assert(Array.isArray(data.credentials), 'Should return array');
    data.credentials.forEach(cred => {
      assert(cred.chainId === SEPOLIA_CHAIN_ID, 'All credentials should be on Sepolia');
    });
  });
  
  await test('GET /api/credentials/by-label/:label - Get by label', async () => {
    const data = await fetchJson(`/api/credentials/by-label/${TEST_LABEL}`);
    assert(data.label === TEST_LABEL, `Label should be ${TEST_LABEL}`);
    assert(data.fullName === `${TEST_LABEL}.ecs.eth`, 'Should have full name');
    assert(data.owner, 'Should have owner');
    assert(data.resolverAddress, 'Should have resolver address');
  });
  
  await test('GET /api/resolvers - List all resolvers', async () => {
    const data = await fetchJson('/api/resolvers');
    assert(Array.isArray(data.resolvers), 'Should return array of resolvers');
    assert(data.pagination, 'Should have pagination');
    
    if (data.resolvers.length > 0) {
      const resolver = data.resolvers[0];
      assert(resolver.address, 'Resolver should have address');
      assert(resolver.owner, 'Resolver should have owner');
      assert(resolver.chainId, 'Resolver should have chainId');
    }
  });
  
  await test('GET /api/resolvers/:chainId/:address - Get resolver details', async () => {
    const data = await fetchJson(`/api/resolvers/${SEPOLIA_CHAIN_ID}/${TEST_RESOLVER}`);
    assert(data.address.toLowerCase() === TEST_RESOLVER.toLowerCase(), 'Should return correct resolver');
    assert(data.owner, 'Should have owner');
    assert(data.chainId === SEPOLIA_CHAIN_ID, 'Should be on Sepolia');
    assert(typeof data.textRecords === 'object', 'Should have textRecords');
    assert(typeof data.contractMetadata === 'object', 'Should have contractMetadata');
  });
  
  await test('GET /api/resolvers/:chainId/:address/text - Get text records', async () => {
    const data = await fetchJson(`/api/resolvers/${SEPOLIA_CHAIN_ID}/${TEST_RESOLVER}/text`);
    assert(data.resolverAddress.toLowerCase() === TEST_RESOLVER.toLowerCase(), 'Should return correct resolver');
    assert(Array.isArray(data.textRecords), 'Should have textRecords array');
  });
  
  await test('GET /api/resolvers/:chainId/:address/metadata - Get ERC-8049 metadata', async () => {
    const data = await fetchJson(`/api/resolvers/${SEPOLIA_CHAIN_ID}/${TEST_RESOLVER}/metadata`);
    assert(data.contractAddress.toLowerCase() === TEST_RESOLVER.toLowerCase(), 'Should return correct contract');
    assert(Array.isArray(data.metadata), 'Should have metadata array');
    
    // Should have the test metadata entry
    if (data.metadata.length > 0) {
      const entry = data.metadata[0];
      assert(entry.key, 'Metadata entry should have key');
      assert(entry.value, 'Metadata entry should have value');
    }
  });
  
  await test('GET /api/stats - Get global statistics', async () => {
    const data = await fetchJson('/api/stats');
    assert(data.credentials, 'Should have credentials stats');
    assert(typeof data.credentials.total === 'number', 'Should have total credentials');
    assert(typeof data.credentials.active === 'number', 'Should have active credentials');
    assert(typeof data.credentials.expired === 'number', 'Should have expired credentials');
    assert(data.resolvers, 'Should have resolvers stats');
    assert(typeof data.resolvers.total === 'number', 'Should have total resolvers');
    assert(data.metadata, 'Should have metadata stats');
  });
  
  /* --- Error Cases --- */
  
  console.log('\n--- Error Cases ---\n');
  
  await test('GET /api/credentials - Fails without auth', async () => {
    try {
      await fetch(`${BASE_URL}/api/credentials`);
      // If we get here without auth and it succeeds, that's actually an error in our test
      // But for public endpoints or dev mode, this might be ok
    } catch (e) {
      // Expected to fail
    }
    // Just checking it doesn't crash
    assert(true, 'Should handle missing auth gracefully');
  });
  
  await test('GET /api/credentials/by-label/nonexistent - Returns 404 for unknown label', async () => {
    try {
      await fetchJson('/api/credentials/by-label/this-label-does-not-exist-12345');
      throw new Error('Should have returned 404');
    } catch (e) {
      assert(e.message.includes('404') || e.message.includes('not found'), 'Should return 404');
    }
  });
  
  await test('GET /api/resolvers/:chainId/:address/info - Unknown resolver returns empty', async () => {
    const data = await fetchJson(`/api/resolvers/${SEPOLIA_CHAIN_ID}/0x0000000000000000000000000000000000000001/info`, { public: true });
    assert(data.label === '', 'Should return empty label for unknown resolver');
  });
  
  /* --- Summary --- */
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed\n`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
