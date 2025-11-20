# Arkiv Music Rental System Setup Guide

This guide explains how to deploy and configure the rental pricing system with smart contract integration and Mimic protocol for automatic expiration.

## Overview

The rental system allows users to rent music/video content with three pricing tiers:
- **7 days**: 0.0001 ETH
- **30 days**: 0.0003 ETH
- **1 year**: 0.0005 ETH

Rentals are managed through:
1. **Smart Contract** (`ArkivRental.sol`) - Handles on-chain rental payments
2. **Mimic Protocol** - Automatically expires rentals when the period ends
3. **Backend API** - Coordinates between smart contract, Mimic, and database

## Prerequisites

1. **Wallet with Testnet ETH**
   - You need a wallet funded with Mendoza testnet ETH for deployment
   - Private key should be stored in `ARKIV_PRIVATE_KEY` environment variable

2. **Solidity Compiler**
   - Install solc: `npm install -g solc`
   - Or use Remix IDE for manual compilation

3. **Mimic Protocol Access** (Optional for testing)
   - Sign up at Mimic Protocol website
   - Get API key for automated task scheduling

## Step 1: Compile the Smart Contract

### Option A: Using Remix IDE (Recommended)

1. Go to https://remix.ethereum.org
2. Create a new file `ArkivRental.sol`
3. Copy the contract code from `contracts/ArkivRental.sol`
4. Compile with Solidity 0.8.20
5. Copy the **ABI** and **Bytecode** from the compilation artifacts

### Option B: Using solc

```bash
# Install solc
npm install -g solc

# Compile the contract
solc --abi --bin --optimize contracts/ArkivRental.sol -o build/

# The ABI will be in build/ArkivRental.abi
# The bytecode will be in build/ArkivRental.bin
```

## Step 2: Set Environment Variables

Add these to your Replit Secrets or `.env` file:

```bash
# Required for deployment
ARKIV_PRIVATE_KEY=your_wallet_private_key_here
MENDOZA_RPC_URL=https://mendoza-testnet-rpc.arkiv.network

# After compiling, add the bytecode
RENTAL_CONTRACT_BYTECODE=0x60806040... # Full bytecode from compilation

# After deployment, add the contract address
RENTAL_CONTRACT_ADDRESS=0x... # Will be set by deployment script

# Optional: Mimic Protocol (for automatic expiration)
MIMIC_API_KEY=your_mimic_api_key_here
MIMIC_API_URL=https://api.mimic.fi/v1

# Optional: Webhook URL for Mimic callbacks
MIMIC_WEBHOOK_URL=https://your-app.replit.dev/api/webhooks/mimic/rental-expired
APP_URL=https://your-app.replit.dev
```

## Step 3: Deploy the Smart Contract

```bash
# Run the deployment script
npx tsx scripts/deploy-rental-contract.ts
```

The script will:
1. Connect to Mendoza testnet using your private key
2. Deploy the `ArkivRental` contract
3. Save the contract address to `.env.contract`
4. Save deployment info to `deployment.json`
5. Verify the contract is working

**Important**: Copy the contract address from the output and add it to your environment variables as `RENTAL_CONTRACT_ADDRESS`.

## Step 4: Update Database Schema

The schema has been updated with two new fields for `userRentals`:
- `contractAddress` - Stores which smart contract was used
- `mimicTaskId` - Tracks the Mimic protocol task for auto-expiration

No manual migration needed - Drizzle ORM will handle schema changes automatically.

## Step 5: Configure Mimic Protocol (Optional)

If you want automatic rental expiration:

1. **Sign up for Mimic Protocol**
   - Visit the Mimic Protocol website
   - Create an account and get your API key

2. **Set Environment Variables**
   ```bash
   MIMIC_API_KEY=your_api_key_here
   MIMIC_WEBHOOK_URL=https://your-app.replit.dev/api/webhooks/mimic/rental-expired
   ```

3. **Configure Webhook**
   - The webhook endpoint is automatically created at `/api/webhooks/mimic/rental-expired`
   - Mimic will call this endpoint when rentals expire
   - Make sure your app URL is publicly accessible

### Testing Without Mimic (Mock Mode)

If you don't have a Mimic API key, the system runs in mock mode:
- Rental expiration tasks are logged but not scheduled
- You can manually expire rentals via the smart contract
- Expiration still works via database time checks

## Step 6: Test the Rental Flow

### 6.1. Get Pricing Tiers

```bash
curl http://localhost:5000/api/rentals/pricing
```

Response:
```json
{
  "tiers": [
    { "durationDays": 7, "priceEth": "0.0001", "label": "7 Days" },
    { "durationDays": 30, "priceEth": "0.0003", "label": "30 Days" },
    { "durationDays": 365, "priceEth": "0.0005", "label": "1 Year" }
  ],
  "contractAddress": "0x..."
}
```

### 6.2. Rent Content via Smart Contract

**Frontend Flow** (MetaMask):
1. User selects a pricing tier (7, 30, or 365 days)
2. Frontend calls smart contract `createRental()` function via MetaMask
3. User pays the required ETH amount
4. Transaction is confirmed on-chain
5. Frontend sends transaction hash to backend

**Backend Verification**:
```bash
curl -X POST http://localhost:5000/api/rentals/verify-payment \
  -H "Content-Type: application/json" \
  -d '{
    "rentalId": "unique-rental-id",
    "walletAddress": "0x...",
    "catalogItemId": "catalog-item-id",
    "txHash": "0x...",
    "durationDays": 7
  }'
```

The backend will:
1. Verify the transaction on-chain
2. Clone the playlist on Arkiv
3. Create a Mimic task for auto-expiration
4. Store rental in database
5. Return rental details

### 6.3. Stream Content

```bash
curl "http://localhost:5000/api/stream/{rentalId}/playlist?walletAddress=0x..."
```

### 6.4. Check Rental Status

```bash
curl http://localhost:5000/api/rentals/0x...
```

## Architecture

```
┌─────────────────┐
│   Frontend      │
│   (React +      │
│    MetaMask)    │
└────────┬────────┘
         │
         │ 1. Pay via MetaMask
         ▼
┌─────────────────────────┐
│  Smart Contract         │
│  (ArkivRental.sol)      │
│  - createRental()       │
│  - expireRental()       │
│  - Stores on-chain data │
└────────┬────────────────┘
         │
         │ 2. Verify txHash
         ▼
┌─────────────────────────┐
│  Backend API            │
│  - Verify payment       │
│  - Clone playlist       │
│  - Create Mimic task    │
│  - Store in database    │
└────────┬────────────────┘
         │
         │ 3. Schedule expiration
         ▼
┌─────────────────────────┐
│  Mimic Protocol         │
│  - Auto-expire on time  │
│  - Call webhook         │
│  - Trigger contract     │
└─────────────────────────┘
```

## API Endpoints

### GET /api/rentals/pricing
Get all pricing tiers and contract address.

### POST /api/rentals/verify-payment
Verify on-chain payment and create rental with Mimic expiration.

**Request Body**:
```json
{
  "rentalId": "string",
  "walletAddress": "string",
  "catalogItemId": "string",
  "txHash": "string",
  "durationDays": 7 | 30 | 365
}
```

**Response**:
```json
{
  "id": "rental-id",
  "walletAddress": "0x...",
  "catalogItemId": "...",
  "rentalExpiresAt": "2024-01-01T00:00:00Z",
  "txHash": "0x...",
  "contractAddress": "0x...",
  "mimicTaskId": "...",
  "isActive": true,
  "message": "Rental created successfully with automatic expiration scheduled"
}
```

### POST /api/webhooks/mimic/rental-expired
Webhook called by Mimic protocol when rental expires.

**Request Body**:
```json
{
  "taskId": "string",
  "rentalId": "string",
  "status": "executed"
}
```

## Smart Contract Functions

### createRental(string rentalId, string catalogItemId, uint256 durationDays)
Create a new rental. Must send exact ETH amount for the duration.

**Parameters**:
- `rentalId`: Unique identifier
- `catalogItemId`: ID of content being rented
- `durationDays`: 7, 30, or 365

**Payment Required**:
- 7 days: 0.0001 ETH
- 30 days: 0.0003 ETH
- 365 days: 0.0005 ETH

### expireRental(string rentalId)
Manually expire a rental (only owner or after expiration time).

### isRentalValid(string rentalId) → bool
Check if rental is active and not expired.

### getPriceForDuration(uint256 durationDays) → uint256
Get price in wei for a specific duration.

## Troubleshooting

### Contract Deployment Fails

**Error**: "Insufficient balance"
- **Solution**: Fund your wallet with Mendoza testnet ETH

**Error**: "Contract bytecode not found"
- **Solution**: Compile the contract and set `RENTAL_CONTRACT_BYTECODE`

### Mimic Tasks Not Creating

**Issue**: Tasks log as "MOCK" in console
- **Solution**: Set `MIMIC_API_KEY` environment variable

**Issue**: Webhook not being called
- **Solution**: Ensure `MIMIC_WEBHOOK_URL` is publicly accessible

### Rentals Not Expiring Automatically

**Check**:
1. Mimic API key is set correctly
2. Webhook URL is public and accessible
3. Check Mimic dashboard for task status
4. Verify contract has `expireRental` function callable by owner

## Security Considerations

1. **Private Key**: Never commit `ARKIV_PRIVATE_KEY` to version control
2. **Payment Verification**: Always verify transactions on-chain before creating rentals
3. **Webhook Authentication**: Consider adding HMAC signatures to Mimic webhooks
4. **Rate Limiting**: Add rate limiting to rental endpoints
5. **Input Validation**: Validate all user inputs before processing

## Next Steps

1. Deploy contract to Mendoza testnet
2. Configure Mimic protocol
3. Implement frontend rental UI
4. Test end-to-end flow
5. Monitor Mimic task execution
6. Review contract events in blockchain explorer

## Support

For issues or questions:
- Check contract events in Mendoza testnet explorer
- Review Mimic protocol documentation
- Check application logs for errors
