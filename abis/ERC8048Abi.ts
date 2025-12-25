export const ERC8048Abi = [
  {
    type: "event",
    name: "MetadataSet",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "key", type: "string", indexed: false },
      { name: "value", type: "bytes", indexed: false }
    ]
  },
  {
    type: "function",
    name: "getMetadata",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "key", type: "string" }
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  }
] as const;
