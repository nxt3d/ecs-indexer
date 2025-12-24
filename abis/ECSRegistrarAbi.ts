export const ECSRegistrarAbi = [
  /* --- Events --- */
  {
    type: "event",
    name: "NameRegistered",
    inputs: [
      { name: "label", type: "string", indexed: true },
      { name: "owner", type: "address", indexed: false },
      { name: "cost", type: "uint256", indexed: false },
      { name: "expires", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "NameRenewed",
    inputs: [
      { name: "label", type: "string", indexed: true },
      { name: "cost", type: "uint256", indexed: false },
      { name: "newExpiration", type: "uint256", indexed: false }
    ]
  },

  /* --- View Functions --- */
  {
    type: "function",
    name: "ecsRegistry",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "rentPrice",
    inputs: [
      { name: "label", type: "string" },
      { name: "duration", type: "uint256" }
    ],
    outputs: [{ name: "ethPrice", type: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "available",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "minRegistrationDuration",
    inputs: [],
    outputs: [{ type: "uint64" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxRegistrationDuration",
    inputs: [],
    outputs: [{ type: "uint64" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "minChars",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "maxChars",
    inputs: [],
    outputs: [{ type: "uint16" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPriceDataForLength",
    inputs: [{ name: "charLength", type: "uint16" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view"
  }
] as const;
