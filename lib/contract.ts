export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS as `0x${string}`;

export const VAULT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'referrer', type: 'address' }],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'poolName', type: 'string' },
      { internalType: 'uint256', name: 'targetAPY', type: 'uint256' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'allocateCapital',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'string', name: 'poolName', type: 'string' }],
    name: 'claimYield',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'string', name: 'poolName', type: 'string' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' }
    ],
    name: 'withdrawFromPool',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    name: 'withdrawUnallocated',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimReferralRewards',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'string', name: 'poolName', type: 'string' }
    ],
    name: 'getPosition',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'apy', type: 'uint256' },
      { internalType: 'uint256', name: 'lastTime', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'unallocatedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'referralRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }
] as const;