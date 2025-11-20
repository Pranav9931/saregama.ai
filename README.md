# Saregama.ai - Decentralized Music Streaming Platform

> **Artist-First Web3 Music Platform** - Where creators independently upload, publish, monetize, rent, update, and retract their music securely and globally.

## 🚨 The Problem

### 1. Artists Lack Control Over Distribution Rights

Traditional music distribution is controlled by labels, preventing artists from directly managing their content:

- **Contract Dependencies**: When label contracts end or artists switch labels, their songs must be taken down, causing:
  - Gaps in availability
  - Loss of income
  - Loss of visibility and fan engagement

- **Indie Artist Struggles**: Independent artists suffer the most:
  - No backing or distribution network
  - Frequent catalog disappearances
  - Limited global reach
  - No self-publishing options

### 2. Traditional Streaming Revenue is Extremely Low

Artists earn fractions of a cent per stream and cannot:
- Monetize exclusive content
- Set premium access tiers
- Create rental or pay-per-view models
- Access transparent streaming analytics

### 3. No Platform Allows Independent Publishing with Takedown Rights

Centralized platforms:
- Don't allow direct artist uploads without distributors
- Cannot delete content on-demand (due to internal archiving policies)
- Cannot store content in secure, removable chunks
- Don't comply with artist-controlled takedown requirements

**Artists have no safe "self-publishing" environment with full control.**

### 4. Geographical Restrictions Reduce Discovery & Revenue

Regional licensing means many songs cannot be streamed globally, limiting:
- Artist exposure
- Fan access
- Revenue potential

### 5. No Transparent On-Chain Streaming Analytics

Labels and artists want reliable data on streams, geographies, and performance, but platforms don't expose full analytics or provide verifiable metrics.

---

## ✅ The Solution - Saregama.ai

**Saregama.ai is the first artist-first decentralized streaming platform** combining traditional music streaming UX with blockchain-based storage and rental mechanics.

### Core Value Propositions

#### 🎵 For Artists
- **Full ownership and control** of distribution rights
- **Direct self-publishing** without labels or distributors
- **Higher revenue** through rental streaming models
- **Global reach** without geographical restrictions
- **Transparent analytics** powered by on-chain data
- **Instant content takedown** when needed (contract transitions, rights management)

#### 🎧 For Fans
- **Exclusive premium content** via rental access
- **Global availability** of music without regional blocks
- **Frictionless experience** - no crypto knowledge required
- **Direct artist support** - payments go directly to creators

---

## 🎯 Key Features

### ✅ Currently Implemented

#### 1. **Crossmint Embedded Wallets - Frictionless Web3 Onboarding**
- Email, Google, and Twitter social login
- Automatic wallet generation in the background (Sepolia testnet)
- No seed phrases or crypto knowledge required
- Wallet signature authentication for secure identity verification
- Makes the platform feel like a normal streaming app - powered by blockchain

#### 2. **Direct Artist Upload & Publishing**
- Artists upload audio files directly through the platform
- Automatic FFmpeg processing: audio transcoded to HLS format
- Files chunked into <100KB segments optimized for blockchain storage
- Sequential upload to ARKIV Network with linked-list architecture
- Master M3U8 playlist generation and storage
- Async job tracking for upload progress

#### 3. **ARKIV Network Decentralized Storage**
- Audio chunks uploaded to ARKIV blockchain (Mendoza testnet)
- Content-addressable storage with unique entity IDs
- Linked-list chunk structure for sequential streaming
- Configurable expiration support (infrastructure ready)
- PostgreSQL database tracks ARKIV entity IDs and transaction hashes
- **Development Mode**: Falls back to mock storage when `ARKIV_PRIVATE_KEY` not configured
  - Generates mock entity IDs and transaction hashes
  - Simulates upload workflow for testing without blockchain costs
  - Real blockchain storage requires wallet configuration

#### 4. **Time-Based Rental System**
- Users rent tracks for specified durations (default: configurable days)
- Rental verification on every stream request
- Automatic expiration checking and enforcement
- Wallet-based access control (only rental owner can stream)
- Rental history tracking per user
- **Note**: Payments currently simulated (on-chain payment verification planned)

#### 5. **HLS Adaptive Streaming**
- Industry-standard HTTP Live Streaming protocol
- Dynamic M3U8 playlist generation per rental
- Chunk-by-chunk progressive loading from ARKIV
- Rental ownership verified before serving each chunk
- Optimized for blockchain storage (<100KB segments)

#### 6. **Wallet Signature Authentication**
- Secure authentication via wallet signatures (no passwords)
- Nonce-based replay attack protection
- 5-minute nonce expiration for security
- Single-use nonce validation
- Automatic profile creation on first login
- Session-free authentication (stateless)

#### 7. **3D Audio Visualizations**
- Immersive WebGL-based visualizers using Three.js
- Real-time audio-reactive animations
- "Vissonance" mode with particle systems and frequency analysis
- Fullscreen visualization experience
- Multiple visualization styles

#### 8. **Modern Music Streaming UX**
- Browse catalog with responsive grid layouts
- Track detail pages with rental CTA
- Personal rental library management
- Artist upload dashboard with job status tracking
- Global music player with playback controls
- Light/dark mode theming
- Mobile-responsive design

### 🚧 Planned Features (From Original Vision)

#### 1. **On-Chain Payment Integration**
**Status**: Core rental logic implemented, payment verification needed
- On-chain ETH payment verification (currently simulated)
- Verify transaction value matches `item.priceEth`
- Validate transaction recipient address
- Record verified on-chain transaction hashes
- Automated refunds for failed rentals

#### 2. **Smart Contract Rental System**
**Status**: Backend rental logic complete, smart contracts not deployed
- Deploy EVM-compatible rental access contracts
- Automated rental creation via contract events
- On-chain ownership records and provenance
- Smart contract-enforced expiration
- Revenue accounting with automated artist payouts
- Stream event logging on-chain for analytics

#### 3. **Active Content Takedown Mechanism**
**Status**: ARKIV expiration infrastructure ready, UI controls needed
- Artist-initiated content removal API
- ARKIV expiration configuration on upload
- Immediate takedown capability (not just expiration)
- Takedown history and audit trail
- Reinstatement workflow for content restoration

#### 4. **On-Chain Streaming Analytics**
**Status**: Not implemented
- Record every stream event on-chain
- Track total plays per track
- Geographic distribution data (via IP → location)
- Engagement timeline and listening patterns
- Rental conversion metrics
- Public analytics dashboard for artists

**Benefits for Artists:**
- Full revenue transparency
- Real-time performance metrics
- Geographic insights for tour planning
- Verifiable data for label negotiations

#### 5. **Crossmint Fiat Payment Integration**
**Status**: Wallet infrastructure ready, payment flow not implemented
- Credit card → cryptocurrency conversion via Crossmint
- Fiat payment acceptance for non-crypto users
- Automatic wallet funding for rentals
- Multi-currency support (USD, EUR, etc.)
- Lower barrier to entry for mainstream users

#### 6. **Advanced Media Processing**
**Status**: Basic HLS implemented, advanced features pending
- Multiple bitrate transcoding (320kbps, 192kbps, 128kbps)
- Video support (currently audio-only)
- Album and playlist structures
- Lossless audio format support
- Cover art processing and optimization

#### 7. **Artist Dashboard & Advanced Analytics**
**Status**: Basic upload dashboard exists, analytics not implemented
- Real-time earnings tracking dashboard
- Fan engagement metrics and demographics
- Geographic heatmaps of listeners
- Revenue projections and forecasting
- Content performance comparison
- Export analytics data (CSV, PDF reports)

#### 8. **Social Features**
**Status**: Not implemented
- Enhanced artist profile pages with bio and links
- Follower/following system
- Fan comments on tracks
- Track and playlist sharing
- Activity feed for followed artists
- Artist announcements and updates

#### 9. **Mobile Applications**
**Status**: Responsive web app only, native apps not started
- Native iOS app (Swift/SwiftUI)
- Native Android app (Kotlin/Jetpack Compose)
- Offline playback within active rental period
- Push notifications for rental expiration
- Native music player integration

#### 10. **Discovery & Recommendations**
**Status**: Basic browse/search exists, algorithms not implemented
- Collaborative filtering recommendations
- Genre and mood-based categorization
- Trending tracks algorithm
- Personalized "For You" feed
- Similar artists suggestions
- Featured artist showcases

---

## 🧠 Tech Stack

### Frontend

**Core Framework:**
- **React 18** with TypeScript
- **Vite** for blazing-fast build tooling
- **Wouter** for lightweight client-side routing

**State Management:**
- **TanStack Query (React Query v5)** - Server state management and caching
- **React Context** - Global wallet state management
- Custom hooks for business logic

**UI/Styling:**
- **shadcn/ui** - Component library built on Radix UI primitives
- **Tailwind CSS** - Utility-first styling with custom design system
- **Lucide React** - Icon library
- **Framer Motion** - Animations
- Custom CSS variables for theming (light/dark mode)

**Media & Web3:**
- **Crossmint SDK** (`@crossmint/client-sdk-react-ui`) - Embedded wallets and auth
- **HLS.js** - HTTP Live Streaming playback
- **Three.js** - 3D audio visualizations
- **Ethers.js** - Ethereum wallet interactions

**Typography:**
- DM Sans/Inter for body text
- Space Grotesk for headings
- JetBrains Mono for code

### Backend

**Server Framework:**
- **Node.js** with Express.js
- **TypeScript** throughout (ESM modules)
- RESTful API design pattern

**Authentication & Security:**
- Wallet signature verification (ethers.js)
- Session-based authentication
- Nonce-based replay attack protection
- Secure file upload handling

**Media Processing:**
- **FFmpeg** - Audio transcoding and HLS segmentation
- **fluent-ffmpeg** - Node.js wrapper for FFmpeg
- Chunking strategy: <100KB segments for blockchain optimization
- M3U8 master playlist generation

**API Design:**
- Domain-organized endpoints (`/api/auth`, `/api/catalog`, `/api/rentals`)
- Zod validation for request/response schemas
- Multer middleware for multipart file uploads

### Database

**ORM & Database:**
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** via Neon serverless driver
- Schema-first design with TypeScript types
- **Drizzle Zod** - Runtime validation from schema

**Data Models:**
- **Profiles** - User wallet addresses with display metadata
- **Catalog Items** - Track metadata (title, artist, price, duration, cover art)
- **Catalog Chunks** - HLS segments with ARKIV entity IDs (linked-list structure)
- **User Rentals** - Rental records with transaction hashes and expiration
- **Upload Jobs** - Async processing status tracking
- **Auth Nonces** - Temporary nonces for signature verification

### Blockchain & Storage

**ARKIV Network:**
- **@arkiv-network/sdk** - Decentralized storage blockchain
- Viem-based wallet/public clients
- Connected to Mendoza testnet
- RPC endpoint: `https://mendoza.hoodi.arkiv.network/rpc`

**Storage Architecture:**
- Audio files chunked to <100KB segments
- Each chunk uploaded as separate blockchain entity
- Chunks linked via `nextChunkId` (on-chain linked list)
- Master HLS playlist stored as final entity
- Content-addressable storage with retrieval by entity ID

**Smart Contracts (Planned):**
- EVM-compatible rental access logic
- Stream event logging
- Ownership records
- Revenue accounting and automated payouts

### Identity & Wallet Layer

**Crossmint Embedded Wallets:**
- Auto-generated wallets for every user
- Email/social login → blockchain wallet
- No seed phrases required
- Secure custodial encryption
- Works seamlessly with EVM contracts
- Base chain integration

**Use Cases:**
- Artist account creation
- User rental purchases
- Secure playback entitlements
- On-chain streaming logs tied to identity

### DevOps & Tooling

**Build Tools:**
- **TypeScript** - Type safety across entire stack
- **Vite** - Frontend bundling and dev server
- **esbuild** - Backend bundling for production
- **tsx** - TypeScript execution for development

**Code Quality:**
- ESLint configuration
- TypeScript strict mode
- Zod runtime validation

**Development:**
- Hot module replacement (HMR) for frontend
- Auto-restart for backend changes
- Replit-specific dev tools integration

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  React + TanStack Query + Crossmint + HLS.js + Three.js    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Backend                         │
│         Auth + Upload Processing + Rental Logic             │
└─────┬──────────────────────────┬────────────────────────────┘
      │                          │
      │                          │
      ▼                          ▼
┌──────────────┐        ┌──────────────────────┐
│  PostgreSQL  │        │   ARKIV Network      │
│   (Neon)     │        │  (Blockchain Storage)│
│              │        │                      │
│  - Profiles  │        │  - HLS Chunks        │
│  - Catalog   │        │  - Playlists         │
│  - Rentals   │        │  - Content Data      │
└──────────────┘        └──────────────────────┘
```

### Media Upload & Processing Pipeline

```
1. Artist uploads audio file
   ↓
2. Server receives file via Multer
   ↓
3. FFmpeg transcodes to HLS format
   ↓
4. File chunked into <100KB segments
   ↓
5. Each chunk uploaded to ARKIV sequentially
   ├─ Chunk 0 → ARKIV entity ID stored
   ├─ Chunk 1 → Linked to Chunk 0
   ├─ Chunk 2 → Linked to Chunk 1
   └─ Chunk N → Linked to Chunk N-1
   ↓
6. Master M3U8 playlist generated
   ↓
7. Playlist uploaded to ARKIV
   ↓
8. Catalog item created in PostgreSQL
   ├─ Master playlist entity ID
   ├─ Transaction hashes
   ├─ Metadata (title, artist, price)
   └─ Chunk references
```

### Authentication Flow

```
1. User clicks "Login with Email/Google/Twitter"
   ↓
2. Crossmint handles OAuth flow
   ↓
3. Embedded wallet auto-created (Base chain)
   ↓
4. Frontend requests nonce from backend
   ↓
5. User signs nonce with wallet
   ↓
6. Backend verifies signature (ethers.js)
   ↓
7. Profile created/retrieved from database
   ↓
8. Session established
   ↓
9. User authenticated ✓
```

### Rental & Streaming Flow

```
1. User browses catalog
   ↓
2. Clicks "Rent Track" (0.0001 ETH)
   ↓
3. Payment processed (simulated)
   ↓
4. Rental record created with expiration
   ↓
5. User plays track
   ↓
6. Backend verifies active rental
   ↓
7. Master playlist fetched from ARKIV
   ↓
8. HLS.js requests chunks sequentially
   ↓
9. Backend fetches chunks from ARKIV
   ↓
10. Chunks streamed to frontend
    ↓
11. Audio plays seamlessly ✓
```

### Storage Abstraction Layer

```typescript
IStorage Interface
├─ Profile Management
│  ├─ createProfile()
│  ├─ getProfileByWallet()
│  └─ updateProfile()
├─ Catalog Management
│  ├─ createCatalogItem()
│  ├─ getCatalogItems()
│  └─ getCatalogItemById()
├─ Chunk Management
│  ├─ createChunk()
│  ├─ getChunkBySequence()
│  └─ getChunksForItem()
├─ Rental Management
│  ├─ createRental()
│  ├─ getRentalsByUser()
│  └─ hasActiveRental()
└─ Upload Job Tracking
   ├─ createUploadJob()
   ├─ updateJobStatus()
   └─ getUploadJobs()
```

---

## 🚀 Getting Started

### Prerequisites

**System Requirements:**
- **Node.js** 20+ (LTS recommended)
- **FFmpeg** installed and available in PATH
  - Ubuntu/Debian: `apt-get install ffmpeg`
  - macOS: `brew install ffmpeg`
  - Replit: Already pre-installed

**External Services:**
- **PostgreSQL** database (Neon serverless recommended) - **REQUIRED**
- **ARKIV Network** wallet with testnet tokens - **REQUIRED for real blockchain storage**
  - Optional in development (uses mock mode without credentials)
- **Crossmint** account and API key ([Get one here](https://www.crossmint.com/)) - **REQUIRED**

### Environment Variables

Create environment secrets or a `.env` file:

```bash
# ============================================
# REQUIRED - Database (PostgreSQL)
# ============================================
DATABASE_URL=postgresql://username:password@hostname/database
# REQUIRED: The application uses PostgreSQL for all data persistence
# Get from: Neon Console → Connection String
# Example: postgresql://user:pass@ep-cool-name-123.us-east-2.aws.neon.tech/neondb

# ============================================
# REQUIRED (Production) / OPTIONAL (Dev) - ARKIV Blockchain
# ============================================
ARKIV_PRIVATE_KEY=0x1234567890abcdef...
# Your wallet private key (0x-prefixed, 64 hex characters)
# WARNING: Keep this secret! Never commit to version control
# Get testnet tokens from: https://faucet.arkiv.network (if available)
#
# DEVELOPMENT MODE (no ARKIV_PRIVATE_KEY):
# - Upload workflow simulates blockchain operations
# - Generates mock entity IDs and transaction hashes
# - No actual blockchain writes (useful for testing without costs)
# - Playback will fail (no real data on-chain)
#
# PRODUCTION MODE (with ARKIV_PRIVATE_KEY):
# - Real blockchain storage on ARKIV Network
# - Actual transaction costs apply
# - Full upload → streaming workflow functional

ARKIV_RPC_URL=https://mendoza.hoodi.arkiv.network/rpc
# Optional - defaults to Mendoza testnet if not set
# Use this URL for Mendoza testnet access

# ============================================
# REQUIRED - Crossmint (Frontend)
# ============================================
VITE_CROSSMINT_CLIENT_API_KEY=sk_client_...
# Get from: Crossmint Dashboard → API Keys
# Sign up at: https://www.crossmint.com/
# This enables email/social login with embedded wallets

# ============================================
# OPTIONAL - Environment Config
# ============================================
NODE_ENV=development
# Set to "production" for production builds

PORT=5000
# Optional - Server port (defaults to 5000 if not set)
```

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables (see above)
#    - On Replit: Use the Secrets tab in the sidebar
#    - Locally: Create .env file in project root

# 3. Initialize database schema
npm run db:push
# This creates all tables in your PostgreSQL database

# 4. Verify FFmpeg is installed
ffmpeg -version
# Should show FFmpeg version info

# 5. Start development server
npm run dev
# Runs both Express backend and Vite frontend
# Backend: http://localhost:5000/api
# Frontend: Served by Vite, proxied through backend
```

**Development Server:**
- The application will be available at your Replit URL or `http://localhost:5000`
- Hot Module Replacement (HMR) enabled for frontend
- Backend auto-restarts on file changes

### Production Build & Deployment

```bash
# Build optimized bundles
npm run build
# - Frontend: Vite production build → dist/public/
# - Backend: esbuild bundle → dist/index.js

# Start production server
npm start
# Serves built frontend and API on same port
```

**Production Checklist:**
- [ ] Set `NODE_ENV=production`
- [ ] Use production database (not dev/test)
- [ ] Rotate `ARKIV_PRIVATE_KEY` (use dedicated production wallet)
- [ ] Configure CORS for your production domain
- [ ] Enable HTTPS (required for wallet interactions)
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Configure rate limiting on API routes

### Troubleshooting

**"FFmpeg not found" error:**
- Verify FFmpeg is installed: `which ffmpeg`
- On Replit: FFmpeg should be pre-installed
- Locally: Install via package manager (apt, brew, etc.)

**"DATABASE_URL must be set" error:**
- Ensure `DATABASE_URL` is in environment secrets
- Check connection string format is correct
- Test connection: `psql $DATABASE_URL`

**Crossmint "Configuration Required" screen:**
- Verify `VITE_CROSSMINT_CLIENT_API_KEY` is set
- Check API key starts with `sk_client_`
- Ensure you're using a client API key (not staging/server key)

**Upload fails or never completes:**
- Check FFmpeg is working: `ffmpeg -version`
- Verify ARKIV wallet has testnet tokens (if using real blockchain)
- Check backend logs for FFmpeg/ARKIV errors
- Ensure `/tmp/uploads` directory is writable
- **Note**: Without `ARKIV_PRIVATE_KEY`, uploads work in mock mode (testing only)

**Streaming fails ("Failed to fetch chunk"):**
- Verify rental was created successfully
- Check that ARKIV_PRIVATE_KEY is configured (mock mode can't serve real audio)
- Ensure chunks were actually uploaded to ARKIV blockchain
- Check backend logs for chunk fetch errors
- Verify rental hasn't expired

---

## 📁 Project Structure

```
saregama-ai/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── AudioVisualizer.tsx
│   │   │   ├── MusicPlayer.tsx
│   │   │   └── ...
│   │   ├── contexts/        # React Context providers
│   │   │   ├── WalletContext.tsx
│   │   │   └── ChunkFetchContext.tsx
│   │   ├── lib/             # Utilities and helpers
│   │   │   └── queryClient.ts
│   │   ├── pages/           # Route pages
│   │   │   ├── Browse.tsx
│   │   │   ├── Library.tsx
│   │   │   ├── Uploads.tsx
│   │   │   ├── TrackDetail.tsx
│   │   │   └── Visualizer.tsx
│   │   ├── App.tsx          # Root component
│   │   └── index.css        # Global styles
│   └── index.html
├── server/                  # Backend Express application
│   ├── lib/
│   │   ├── arkiv.ts         # ARKIV Network client
│   │   └── ffmpeg.ts        # Media processing
│   ├── db.ts                # Database connection
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API route definitions
│   └── storage.ts           # Storage abstraction layer
├── shared/                  # Shared code between frontend/backend
│   └── schema.ts            # Database schema + types
├── attached_assets/         # Static assets
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── drizzle.config.ts        # Drizzle ORM configuration
├── package.json             # Dependencies
└── README.md                # This file
```

---

## 🔌 API Endpoints

### Authentication

**`POST /api/auth/nonce`**
- Generate authentication nonce for wallet signature
- Body: `{ walletAddress: string }`
- Response: `{ nonce: string }` (valid for 5 minutes)

**`POST /api/auth/verify`**
- Verify wallet signature and authenticate user
- Body: `{ walletAddress: string, signature: string, message: string }`
- Response: `{ profile: Profile, authenticated: boolean }`
- Creates profile on first login

### Profile Management

**`GET /api/profile/:walletAddress`**
- Get user profile by wallet address
- Response: `{ walletAddress, displayName, avatarUrl, createdAt }`

**`PATCH /api/profile/:walletAddress`**
- Update user profile
- Body: `{ displayName?: string, avatarUrl?: string }`
- Response: Updated profile object

### Catalog Browsing

**`GET /api/catalog`**
- List all catalog items with optional filtering
- Query params: `type` (audio/video), `category` (featured/trending/new-releases)
- Response: Array of catalog items

**`GET /api/catalog/:id`**
- Get detailed catalog item by ID
- Response: Catalog item with chunk count

**`GET /api/catalog/:id/chunks`**
- Get all chunks for a catalog item (debug/admin)
- Response: Array of chunk metadata with ARKIV entity IDs

### Upload & Processing

**`POST /api/upload`**
- Upload audio file for processing (multipart/form-data)
- Body (multipart): 
  - `file` (audio file)
  - `title` (string)
  - `artist` (string)
  - `description` (optional string)
  - `category` (optional string)
  - `walletAddress` (string)
- Response: `{ jobId: string, message: string }`
- Triggers async FFmpeg → ARKIV upload pipeline

**`GET /api/upload/jobs/:walletAddress`**
- Get upload jobs for a user
- Response: Array of upload jobs with status

### Rental System

**`POST /api/rentals`**
- Create rental for a track (after payment - currently simulated)
- Body: `{ walletAddress, catalogItemId, txHash, rentalDurationDays }`
- Response: Rental object with expiration date
- **Note**: Payment verification is TODO - currently accepts any txHash

**`GET /api/rentals/:walletAddress`**
- Get user's active rentals
- Response: Array of rentals with catalog item details

**`GET /api/rentals/check/:catalogItemId`**
- Check if user has active rental for specific item
- Query param: `walletAddress`
- Response: `{ hasActiveRental: boolean, rental?: Rental }`

### HLS Streaming (Requires Active Rental)

**`GET /api/stream/:rentalId/playlist`**
- Get HLS master playlist for rental
- Query param: `walletAddress` (ownership verification)
- Response: M3U8 playlist text
- **Security**: Verifies wallet owns rental, checks expiration

**`GET /api/stream/:rentalId/chunk/:sequence`**
- Get specific HLS chunk for rental
- Query param: `walletAddress` (ownership verification)
- Response: Audio chunk binary data
- Headers: `Content-Type: application/octet-stream`
- **Security**: Verifies wallet owns rental, checks expiration on every chunk

---

## 🎨 Design System

### Color Palette

The platform uses a custom color system optimized for music streaming:

**Light Mode:**
- Background: `#fcfcfc` (Off-white for reduced eye strain)
- Foreground: `#0a0a0a` (Near-black text)
- Primary: `#7c3aed` (Vibrant purple)
- Accent: `#ec4899` (Hot pink)

**Dark Mode:**
- Background: `#0a0a0a` (True black for OLED)
- Foreground: `#fafafa` (Off-white text)
- Primary: `#a78bfa` (Lighter purple)
- Accent: `#f472b6` (Lighter pink)

### Typography

- **Headings**: Space Grotesk (bold, modern)
- **Body**: DM Sans / Inter (readable, clean)
- **Code**: JetBrains Mono (monospace)

### Layout Principles

- **Album art as visual anchor** - Large, prominent imagery
- **Grid-based layouts** - Responsive (2-5 columns)
- **Fixed bottom player** - Always accessible
- **Minimal UI distraction** - Immersive music experience

---

## 🔐 Security

### Implemented Security Measures

- **Wallet signature authentication** - No passwords, cryptographic proof
- **Nonce-based replay protection** - Single-use authentication tokens
- **Session expiration** - 5-minute nonce validity
- **Wallet address normalization** - Lowercase storage for consistency
- **Input validation** - Zod schemas on all API endpoints
- **File upload sanitization** - Unique naming, type validation

### Security Considerations

- **Private keys in environment** - Never commit to version control
- **HTTPS required in production** - Secure communication
- **CORS configuration** - Restrict API access
- **Rate limiting** (Planned) - Prevent abuse

---

## 🤝 Contributing

This project is in active development. Key areas for contribution:

1. **Smart contract implementation** - Rental logic, revenue distribution
2. **On-chain analytics** - Stream tracking, geographic data
3. **Mobile apps** - iOS and Android native applications
4. **Payment integration** - Crossmint fiat-to-crypto payments
5. **Advanced discovery** - Recommendation algorithms
6. **Social features** - Artist profiles, comments, sharing

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

- **ARKIV Network** - Decentralized storage infrastructure
- **Crossmint** - Seamless Web3 onboarding
- **shadcn/ui** - Beautiful, accessible component library
- **Radix UI** - Primitive component foundation
- **Drizzle ORM** - Type-safe database operations

---

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact the development team
- Join the community Discord (coming soon)

---

**Built with ❤️ for artists and music lovers everywhere.**

*Empowering artists to own their distribution, one stream at a time.*
