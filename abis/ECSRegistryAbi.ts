export const ECSRegistryAbi = [
  /* --- Events --- */
  {
    type: "event",
    name: "NewLabelhashOwner",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "label", type: "string", indexed: true },
      { name: "owner", type: "address", indexed: false }
    ]
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "owner", type: "address", indexed: false }
    ]
  },
  {
    type: "event",
    name: "ResolverChanged",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "resolver", type: "address", indexed: false }
    ]
  },
  {
    type: "event",
    name: "ResolverReviewUpdated",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "review", type: "string", indexed: false }
    ]
  },
  {
    type: "event",
    name: "labelhashRentalSet",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "expiration", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "ExpirationExtended",
    inputs: [
      { name: "labelhash", type: "bytes32", indexed: true },
      { name: "newExpiration", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "ApprovalForAll",
    inputs: [
      { name: "owner", type: "address", indexed: true },
      { name: "operator", type: "address", indexed: true },
      { name: "approved", type: "bool", indexed: false }
    ]
  },

  /* --- View Functions --- */
  {
    type: "function",
    name: "owner",
    inputs: [{ name: "labelhash", type: "bytes32" }],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "resolver",
    inputs: [{ name: "labelhash", type: "bytes32" }],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getLabel",
    inputs: [{ name: "labelhash", type: "bytes32" }],
    outputs: [{ type: "string" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getResolverInfo",
    inputs: [{ name: "resolver", type: "address" }],
    outputs: [
      { name: "label", type: "string" },
      { name: "resolverUpdated", type: "uint128" },
      { name: "review", type: "string" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getExpiration",
    inputs: [{ name: "labelhash", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isExpired",
    inputs: [{ name: "labelhash", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "resolverToLabelhash",
    inputs: [{ name: "resolver", type: "address" }],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "rootNode",
    inputs: [],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view"
  }
] as const;
