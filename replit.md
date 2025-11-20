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

**Smart Contract Interaction:**
- Wallet signature verification for authentication (no smart contract deployment)
- Rental payments simulated (production would use actual ETH transfers)
- Transaction hashes recorded for rental audit trail

**Rationale:** Separating content storage (Arkiv blockchain) from payment/rental logic (simulated Ethereum) allows independent scaling. Small chunks optimize blockchain storage costs while maintaining streaming compatibility.

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

### Environment Requirements

**Required Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `ARKIV_PRIVATE_KEY` - Wallet private key for blockchain operations (0x-prefixed)
- `ARKIV_RPC_URL` - Arkiv Network RPC endpoint (optional, defaults to Mendoza testnet)

**Optional:**
- `NODE_ENV` - Set to "production" for production builds