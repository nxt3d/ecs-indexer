export const CredentialResolverAbi = [
  /* --- Events (ENS Resolver) --- */
  {
    type: "event",
    name: "AddrChanged",
    inputs: [
      { name: "a", type: "address", indexed: false }
    ]
  },
  {
    type: "event",
    name: "AddressChanged",
    inputs: [
      { name: "coinType", type: "uint256", indexed: false },
      { name: "newAddress", type: "bytes", indexed: false }
    ]
  },
  {
    type: "event",
    name: "ContenthashChanged",
    inputs: [
      { name: "hash", type: "bytes", indexed: false }
    ]
  },
  {
    type: "event",
    name: "TextChanged",
    inputs: [
      { name: "key", type: "string", indexed: true },
      { name: "value", type: "string", indexed: false }
    ]
  },

  /* --- Events (ERC-8049 Contract Metadata) --- */
  {
    type: "event",
    name: "ContractMetadataUpdated",
    inputs: [
      { name: "indexedKey", type: "string", indexed: true },
      { name: "key", type: "string", indexed: false },
      { name: "value", type: "bytes", indexed: false }
    ]
  },

  /* --- Events (Ownable) --- */
  {
    type: "event",
    name: "OwnershipTransferred",
    inputs: [
      { name: "previousOwner", type: "address", indexed: true },
      { name: "newOwner", type: "address", indexed: true }
    ]
  },

  /* --- View Functions --- */
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "addr",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "coinType", type: "uint256" }
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "contenthash",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "text",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    outputs: [{ type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "data",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getContractMetadata",
    inputs: [{ name: "key", type: "string" }],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "resolve",
    inputs: [
      { name: "name", type: "bytes" },
      { name: "data", type: "bytes" }
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "supportsInterface",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view"
  }
] as const;
