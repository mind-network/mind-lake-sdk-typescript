const Abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'wallet',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'MK',
        type: 'bytes',
      },
      {
        indexed: false,
        internalType: 'bytes',
        name: 'SK',
        type: 'bytes',
      },
    ],
    name: 'KeysUpdated',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: '_mk',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: '_sk',
        type: 'bytes',
      },
    ],
    name: 'setKeys',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_wallet',
        type: 'address',
      },
    ],
    name: 'getKeys',
    outputs: [
      {
        internalType: 'bytes',
        name: 'MK',
        type: 'bytes',
      },
      {
        internalType: 'bytes',
        name: 'SK',
        type: 'bytes',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
];

export default Abi;
