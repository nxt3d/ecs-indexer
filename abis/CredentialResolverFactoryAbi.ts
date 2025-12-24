export const CredentialResolverFactoryAbi = [
  /* --- Events --- */
  {
    type: "event",
    name: "ResolverCloneDeployed",
    inputs: [
      { name: "clone", type: "address", indexed: true },
      { name: "owner", type: "address", indexed: true }
    ]
  },

  /* --- View Functions --- */
  {
    type: "function",
    name: "implementation",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "isClone",
    inputs: [{ name: "clone", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "clones",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getCloneCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getClone",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "predictDeterministicAddress",
    inputs: [{ name: "salt", type: "bytes32" }],
    outputs: [{ name: "predicted", type: "address" }],
    stateMutability: "view"
  }
] as const;
