# Arkiv Music - Decentralized Music Streaming Platform

## Overview

Arkiv Music is a Web3-enabled music streaming platform that combines traditional music streaming UX with blockchain-based storage and rental mechanics. The application allows users to upload audio files, which are chunked and stored on the Arkiv blockchain network. Users can rent access to tracks using Ethereum, with time-based rental expiration mechanics.

The platform bridges the gap between familiar music streaming interfaces (inspired by Spotify, Apple Music, and SoundCloud) and decentralized storage powered by the Arkiv Network blockchain.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework Stack:**
- **React 18** with TypeScript for the UI layer
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **TanStack Query** (React Query) for server state management and data fetching

**Component System:**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with a custom design system
- Design follows the "New York" style from shadcn with extensive customization
- Custom CSS variables for theming (light/dark mode support)
- Typography system using DM Sans/Inter for body text and Space Grotesk for headings

**State Management Pattern:**
- Global wallet state managed through React Context (`WalletContext`)
- Server state cached and synchronized via TanStack Query
- Local UI state managed with React hooks
- No global state management library (Redux/Zustand) - keeps architecture simple

**Key Design Decisions:**
- Album art as visual anchor - large prominent imagery following music streaming conventions
- Grid-based layouts for music libraries (responsive: 2-5 columns based on viewport)
- Fixed bottom music player (24-28px height)
- Immersive experience with minimal UI distraction

### Backend Architecture

**Server Framework:**
- **Express.js** with TypeScript running on Node.js
- ESM module system throughout the codebase
- Custom middleware for request logging and JSON parsing

**API Design:**
- RESTful API endpoints organized by domain (`/api/auth`, `/api/catalog`, `/api/rentals`)
- Session-based authentication with wallet signature verification
- File upload handling via Multer middleware

**Authentication Flow:**
1. Client requests nonce for wallet address
2. User signs nonce with MetaMask (wallet signature)
3. Server verifies signature using ethers.js
4. Profile created/retrieved and session established
5. Nonce invalidated after use (replay attack protection)

**Media Processing Pipeline:**
- FFmpeg integration for audio transcoding to HLS (HTTP Live Streaming) format
- Chunking strategy: audio files split into <100KB segments for blockchain storage
- Segments uploaded sequentially to Arkiv Network with linked-list structure
- Master playlist (M3U8) generated and stored on-chain

**Rationale:** HLS chunking enables progressive streaming and keeps individual blockchain storage operations small. The linked-list pattern allows for efficient sequential playback without loading entire files.

### Database Layer

**ORM & Schema:**
- **Drizzle ORM** for type-safe database operations
- **PostgreSQL** via Neon serverless driver
- Schema defined in TypeScript with Zod validation

**Data Models:**

1. **Profiles** - User wallet addresses with optional display metadata
2. **Catalog Items** - Audio/video metadata (title, artist, price, duration, cover art)
3. **Catalog Chunks** - HLS segments with Arkiv entity IDs in linked-list structure
4. **User Rentals** - Rental records tracking access rights, transaction hashes, expiration dates
5. **Upload Jobs** - Async processing status for chunking/uploading workflows

**Storage Abstraction:**
- `IStorage` interface abstracts database operations
- Enables swapping implementations without changing business logic
- Currently implemented with in-memory storage (suitable for development/demo)

**Design Trade-offs:**
- Linked-list chunk structure enables sequential streaming but requires multiple reads
- Rental expiration checked on-demand rather than background jobs (simpler but less proactive)
- In-memory storage is not persistent - production would need PostgreSQL implementation

### Blockchain Integration

**Arkiv Network SDK:**
- Custom blockchain network for decentralized file storage
- Uses Viem-based wallet/public clients (`@arkiv-network/sdk`)
- Connected to Mendoza testnet via RPC endpoint

**Storage Operations:**
1. Audio files chunked to <100KB segments
2. Each chunk uploaded as separate blockchain entity
3. Chunks linked via `nextChunkId` creating on-chain linked list
4. Master HLS playlist stored as final entity

**Smart Contract System:**

**Rental Contract (ArkivRental.sol):**
- Solidity smart contract deployed on Mendoza testnet
- Three pricing tiers:
  - 7 days: 0.0001 ETH
  - 30 days: 0.0003 ETH  
  - 1 year: 0.0005 ETH
- Function: `createRental(string rentalId, string catalogItemId, uint256 durationDays)`
- Emits: `RentalCreated(string indexed rentalId, address indexed user, string catalogItemId, uint256 expiresAt, uint256 paidAmount)`
- Security: `nonReentrant` modifier, no owner withdrawal (rental-only)

**Payment Flow:**
1. Frontend fetches pricing tiers from `/api/rentals/pricing`
2. User selects tier and initiates payment via MetaMask
3. Frontend encodes smart contract function call with rental data
4. Transaction sent to contract with ETH value
5. Backend verifies transaction on-chain via `/api/rentals/verify-payment`
6. Backend parses `RentalCreated` event from transaction logs
7. Rental record created in database
8. Mimic protocol task scheduled for automatic expiration

**Rationale:** Separating content storage (Arkiv blockchain) from payment/rental logic (Ethereum smart contract) allows independent scaling. On-chain rental verification ensures payment integrity. Small chunks optimize blockchain storage costs while maintaining streaming compatibility.

## External Dependencies

### Blockchain Services

- **Arkiv Network** - Decentralized storage blockchain (Mendoza testnet)
  - RPC endpoint: `https://mendoza.hoodi.arkiv.network/rpc`
  - Purpose: Store chunked audio files and playlists
  - SDK: `@arkiv-network/sdk`

- **Ethereum Wallet Integration** (MetaMask)
  - Purpose: User authentication via wallet signatures
  - Library: `ethers.js` for signature verification

### Database

- **Neon PostgreSQL** (serverless)
  - Driver: `@neondatabase/serverless`
  - Connection via DATABASE_URL environment variable
  - Drizzle ORM for schema management

### Media Processing

- **FFmpeg** - Audio/video transcoding
  - Purpose: Convert uploads to HLS format with segmentation
  - Wrapper: `fluent-ffmpeg` Node.js library
  - Must be installed on host system

### UI Component Libraries

- **Radix UI Primitives** - Headless accessible components
- **shadcn/ui** - Pre-built component implementations
- **Tailwind CSS** - Utility-first styling framework
- **Lucide React** - Icon library

### Development Tools

- **Vite** - Frontend build tool and dev server
  - Plugins: React, runtime error overlay (Replit-specific)
- **TypeScript** - Type safety across frontend/backend
- **Drizzle Kit** - Database migrations and schema push

### Third-Party APIs

- **Google Fonts CDN** - Typography (DM Sans, Inter, Space Grotesk, JetBrains Mono)
- **Mimic Protocol** - Automated task scheduling for rental expiration
  - Purpose: Trigger rental expiration after time period ends
  - Webhook endpoint: `/api/rentals/mimic-webhook`
  - Security: HMAC signature verification for webhook authenticity

### Environment Requirements

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `ARKIV_PRIVATE_KEY` - Wallet private key for blockchain operations (0x-prefixed)
- `ARKIV_RPC_URL` - Arkiv Network RPC endpoint (optional, defaults to Mendoza testnet)

**Rental System (Required for production):**
- `RENTAL_CONTRACT_ADDRESS` - Deployed ArkivRental.sol contract address on Mendoza testnet
- `MIMIC_API_KEY` - Mimic protocol API key (stored in Replit Secrets)
- `MIMIC_WEBHOOK_SECRET` - Mimic webhook signature secret (stored in Replit Secrets)

**Optional:**
- `NODE_ENV` - Set to "production" for production builds

## Rental System Architecture

### Smart Contract Deployment

The rental system uses an Ethereum smart contract deployed on the Arkiv Mendoza testnet (Chain ID: 10000) to handle payments and rental creation.

**Contract: ArkivRental.sol**
- Location: `contracts/ArkivRental.sol`
- Deployment script: `scripts/deploy.ts`
- Network: Mendoza testnet (https://mendoza-testnet-rpc.arkiv.network)
- Block explorer: https://explorer.arkiv.network

**To deploy the contract:**

```bash
# 1. Ensure you have testnet ETH in your deployer wallet
# 2. Run the deployment script
npx tsx scripts/deploy.ts

# 3. Copy the contract address from the output
# 4. Set the environment variable
RENTAL_CONTRACT_ADDRESS=0x...your-contract-address...
```

**Contract Features:**
- Three hardcoded pricing tiers (7 days, 30 days, 1 year)
- `createRental()` function accepts payment and emits rental event
- Non-reentrant protection
- No owner withdrawal (rental-only contract)

### Mimic Protocol Integration

Mimic protocol provides automated task execution for rental expiration. When a rental is created, the backend schedules a Mimic task to expire the rental automatically.

**Setup Steps:**

1. **Create Mimic Account**: Sign up at https://mimic.fi
2. **Generate API Key**: Create API key in Mimic dashboard
3. **Store in Secrets**: Add to Replit Secrets (NOT in code):
   - `MIMIC_API_KEY` - Your Mimic API key
   - `MIMIC_WEBHOOK_SECRET` - Webhook signature secret from Mimic

4. **Configure Webhook**: Set Mimic webhook URL to:
   ```
   https://your-repl-name.replit.app/api/rentals/mimic-webhook
   ```

**How It Works:**

1. User pays for rental via MetaMask
2. Backend creates rental record in database
3. Backend schedules Mimic task with:
   - Target: Mendoza RPC endpoint
   - Contract: Rental contract address
   - Function: `expireRental(rentalId)`
   - Execution time: Rental expiration timestamp

4. At expiration time, Mimic executes the task
5. Mimic webhook calls backend endpoint
6. Backend marks rental as expired in database

**Security:**
- Webhook signature verification using HMAC-SHA256
- Validates signature matches `MIMIC_WEBHOOK_SECRET`
- Rejects unsigned or invalid webhook requests

### Backend Rental Flow

**API Endpoints:**

1. `GET /api/rentals/pricing` - Fetch pricing tiers and contract address
   - Returns: `{ contractAddress, tiers: [{ durationDays, priceEth, label }] }`
   - Used by frontend to display rental options

2. `POST /api/rentals/verify-payment` - Verify blockchain transaction and create rental
   - Body: `{ txHash, rentalId, catalogItemId, durationDays, walletAddress }`
   - Verifies transaction on-chain
   - Parses `RentalCreated` event from transaction logs
   - Creates rental record in database
   - Schedules Mimic expiration task
   - Returns: `{ success: true, rental: {...} }`

3. `POST /api/rentals/mimic-webhook` - Handle rental expiration callbacks
   - Validates webhook signature
   - Marks rental as expired in database
   - Returns: `{ success: true }`

**Transaction Verification (`server/lib/web3Verify.ts`):**
- Fetches transaction receipt from Mendoza RPC
- Validates transaction succeeded (status === 1)
- Verifies transaction sent to correct contract address
- Parses `RentalCreated` event using ABI
- Extracts rental data (rentalId, user, catalogItemId, expiresAt, paidAmount)
- Validates rental parameters match user request

**Security Measures:**
- On-chain transaction verification (not just trusting frontend)
- Event log parsing to verify contract execution
- Network validation (ensures Mendoza testnet)
- Webhook signature verification
- NonReentrant modifier in smart contract

### Frontend Rental Flow

**Component: RentalPayment (`client/src/components/RentalPayment.tsx`)**

**User Flow:**
1. User navigates to track detail page
2. If wallet not connected, shows "Connect Wallet" button
3. After connection, displays three pricing tier cards
4. User clicks "Rent Now" on desired tier
5. MetaMask prompts network switch (if not on Mendoza)
6. MetaMask prompts transaction approval
7. Frontend waits for blockchain confirmation (1 block)
8. Backend verifies transaction and creates rental
9. Success screen shows transaction hash with explorer link

**Network Validation:**
- Checks current network via MetaMask
- If not Mendoza (Chain ID 10000), prompts switch
- If network not added, prompts to add Mendoza testnet
- RPC URL: https://mendoza-testnet-rpc.arkiv.network
- Explorer: https://explorer.arkiv.network

**Error Handling:**
- User rejects network switch: Shows error, allows retry
- User rejects transaction: Shows cancellation message, resets UI
- Transaction fails: Shows error with details
- Network errors: Graceful fallback with retry option

**Payment States:**
- `select` - User selecting pricing tier
- `paying` - MetaMask transaction in progress
- `verifying` - Waiting for backend verification
- `complete` - Rental created successfully

### Testing the Rental System

**Prerequisites:**
1. Deploy smart contract and set `RENTAL_CONTRACT_ADDRESS`
2. Add Mimic API credentials to Replit Secrets
3. Have testnet ETH in MetaMask wallet
4. MetaMask configured for Mendoza testnet

**Manual Testing Flow:**
1. Navigate to any track detail page
2. Connect MetaMask wallet
3. View three pricing tiers
4. Click "Rent Now" on 7-day tier
5. Approve network switch (if needed)
6. Approve transaction in MetaMask
7. Wait for confirmation
8. Verify rental appears in "My Music" library
9. Verify transaction on Arkiv explorer

**Testing Scenarios:**
- ✅ Connect wallet and view pricing
- ✅ Pay for 7-day rental
- ✅ Pay for 30-day rental  
- ✅ Pay for 1-year rental
- ✅ Cancel transaction in MetaMask
- ✅ Reject network switch
- ✅ Verify rental shows in library
- ✅ Play rented track
- ✅ (After expiration) Verify rental expires

**Mock Mode:**
If `RENTAL_CONTRACT_ADDRESS` is not set, the backend returns mock pricing but rental payments will fail. This allows frontend development without deployed contract.

## Production Deployment Checklist

Before deploying to production:

**1. Smart Contract**
- [ ] Deploy ArkivRental.sol to Mendoza testnet
- [ ] Verify contract on block explorer
- [ ] Set `RENTAL_CONTRACT_ADDRESS` environment variable
- [ ] Test contract interaction via Remix/Hardhat

**2. Mimic Protocol**
- [ ] Create Mimic account and generate API key
- [ ] Add `MIMIC_API_KEY` to Replit Secrets
- [ ] Add `MIMIC_WEBHOOK_SECRET` to Replit Secrets
- [ ] Configure webhook URL in Mimic dashboard
- [ ] Test webhook signature verification

**3. Environment Variables**
- [ ] All required variables set
- [ ] Secrets stored in Replit Secrets (not in code)
- [ ] Database connection working
- [ ] Arkiv blockchain connection working

**4. Testing**
- [ ] Manual end-to-end rental flow
- [ ] Transaction verification working
- [ ] Mimic webhook receiving callbacks
- [ ] Rental expiration working correctly
- [ ] Error handling for failed transactions

**5. Security Review**
- [ ] Smart contract audited (recommended)
- [ ] Webhook signature verification enabled
- [ ] No private keys in code
- [ ] Environment variables properly secured
- [ ] HTTPS enabled for production