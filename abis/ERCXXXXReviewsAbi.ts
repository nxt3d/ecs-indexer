export const ERCXXXXReviewsAbi = [
  {
    type: "event",
    name: "ReviewSubmitted",
    inputs: [
      { name: "reviewerId", type: "uint256", indexed: true },
      { name: "reviewedId", type: "uint256", indexed: true },
      { name: "reviewData", type: "bytes", indexed: false }
    ]
  },
  {
    type: "function",
    name: "getReview",
    inputs: [
      { name: "reviewerId", type: "uint256" },
      { name: "reviewedId", type: "uint256" }
    ],
    outputs: [{ type: "bytes" }],
    stateMutability: "view"
  }
] as const;
