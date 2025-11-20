export const CONTRACT_ADDRESS = "0x7AdceCe47B501fD61326Cec01E5711a6B9AB334e";

export const CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_platformFeePercentage",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_platformFeeRecipient",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "artistAddress",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "priceWei",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rentalDurationDays",
        "type": "uint256"
      }
    ],
    "name": "CatalogItemAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPriceWei",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newRentalDurationDays",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "name": "CatalogItemUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PlatformFeePaid",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "PlatformFeeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "rentalId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "renter",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "paidAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "rentalEndTime",
        "type": "uint256"
      }
    ],
    "name": "RentalPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "artist",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "RoyaltyPaid",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "artistAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "priceWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rentalDurationDays",
        "type": "uint256"
      }
    ],
    "name": "addCatalogItem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "catalogItems",
    "outputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "artistAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "priceWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rentalDurationDays",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalRentals",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalEarnings",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      }
    ],
    "name": "getCatalogItem",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "catalogItemId",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "artistAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "priceWei",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rentalDurationDays",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "totalRentals",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalEarnings",
            "type": "uint256"
          }
        ],
        "internalType": "struct ArkivMusicRental.CatalogItem",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "rentalId",
        "type": "bytes32"
      }
    ],
    "name": "getRental",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "catalogItemId",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "renter",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "paidAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rentalStartTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rentalEndTime",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct ArkivMusicRental.Rental",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "rentalId",
        "type": "bytes32"
      }
    ],
    "name": "getRentalStatus",
    "outputs": [
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isExpired",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "timeRemaining",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserRentals",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "rentalId",
        "type": "bytes32"
      }
    ],
    "name": "isRentalActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      }
    ],
    "name": "purchaseRental",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "rentalId",
        "type": "bytes32"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "rentals",
    "outputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "renter",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "paidAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rentalStartTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rentalEndTime",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "catalogItemId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "newPriceWei",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newRentalDurationDays",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      }
    ],
    "name": "updateCatalogItem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newFeePercentage",
        "type": "uint256"
      }
    ],
    "name": "updatePlatformFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newRecipient",
        "type": "address"
      }
    ],
    "name": "updatePlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userRentals",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const SEPOLIA_CHAIN_ID = 11155111;
