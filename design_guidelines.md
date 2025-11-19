# Design Guidelines: Arkiv Music Streaming Platform

## Design Approach

**Reference-Based Design** drawing from premium music streaming platforms with Web3 integration:

**Primary References:**
- **Spotify**: Grid-based library layouts, player controls, playlist aesthetics
- **Apple Music**: Clean typography hierarchy, album art prominence, spatial audio UI
- **SoundCloud**: Waveform visualizations, track metadata display
- **Rainbow/Uniswap**: Modern Web3 wallet connection patterns, transaction states

**Core Principles:**
1. Album art as the visual anchor - large, prominent imagery
2. Immersive music experience with minimal UI distraction
3. Clear blockchain transaction states (rental status, expiration)
4. Seamless blend of music streaming UX with Web3 functionality

---

## Typography System

**Font Stack:**
- Primary: Inter or DM Sans (clean, modern sans-serif via Google Fonts CDN)
- Accent: Space Grotesk for headlines/track titles (distinctive character)

**Type Scale:**
- Hero/Headers: 3xl to 4xl, font-weight: 700
- Track Titles: xl, font-weight: 600
- Artist Names: base, font-weight: 400
- Metadata (duration, rental): sm, font-weight: 500
- UI Labels: xs, font-weight: 600, uppercase tracking-wide

---

## Layout System

**Spacing Primitives:**
Use Tailwind units: **2, 4, 6, 8, 12, 16** for consistent rhythm

**Grid System:**
- Library Grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` for album cards
- Gap: `gap-6` on mobile, `gap-8` on desktop
- Container: `max-w-7xl mx-auto px-4 md:px-6 lg:px-8`

**Player Layout:**
- Fixed bottom player: `h-24 md:h-28` 
- Album art in player: Square `w-16 h-16 md:w-20 h-20`
- Responsive breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)

---

## Component Library

### 1. Wallet Connection
**MetaMask Integration Header:**
- Top-right wallet button with address truncation (0x1234...5678)
- Connection states: "Connect Wallet" → "Connecting..." → Address display
- Network indicator badge for Arkiv Mendoza testnet
- Account balance display (optional)
- Disconnect option in dropdown menu

### 2. Music Library Grid
**Album/Track Cards:**
- Square album art with 1:1 aspect ratio
- Hover state: Subtle scale transform, play button overlay (blur backdrop)
- Track metadata below: Title (bold), Artist, Duration
- Rental status badge: "X days left" or "Expired" with icon
- Loading skeleton state for cards

**Views:**
- Default: Grid view (cards)
- Optional: List view toggle (compact horizontal rows)

### 3. Upload Interface
**Drag-and-Drop Zone:**
- Large centered dropzone: min-height `h-64 md:h-80`
- Dashed border on idle, solid on drag-over
- Icon + "Drop audio file here" message
- File picker button as alternative
- Progress indicator during HLS chunking and blockchain upload
- Multi-step progress: "Processing → Chunking → Uploading to Arkiv → Complete"

**Metadata Form:**
- Fields: Track Title, Artist Name, Album Art Upload, Rental Duration (dropdown or slider)
- Rental duration options: 7 days, 30 days, 90 days, 1 year
- Preview section showing estimated blockchain cost

### 4. Music Player (Fixed Bottom)
**Layout Structure:**
- Left section: Album art + Track metadata (title, artist)
- Center section: Playback controls + progress bar
- Right section: Volume control + additional actions

**Playback Controls:**
- Icon buttons: Previous, Play/Pause (larger), Next
- Size: Previous/Next `w-8 h-8`, Play/Pause `w-12 h-12`
- Progress bar: Full-width slider with current time / total time
- Waveform visualization (optional): Small amplitude bars behind progress

**Progress Slider:**
- Thin track `h-1`, larger thumb `w-3 h-3`
- Buffered region indicator (lighter opacity)
- Hover state: Track expands to `h-1.5`

**Volume Control:**
- Icon button + slider (appears on hover/click)
- Mute toggle functionality

### 5. Rental Management Panel
**Track Detail View:**
- Expiration countdown timer (days:hours:minutes)
- "Extend Rental" button with duration picker
- Transaction history: Upload date, extensions, blockchain TX hashes
- Rental status progress bar (visual representation of time remaining)

### 6. Empty States
**No Tracks Uploaded:**
- Centered illustration/icon placeholder
- "Upload your first track" heading
- Call-to-action button to upload modal

**Rental Expired:**
- Greyed-out album art with "Expired" overlay
- "Renew" button with pricing

---

## Navigation

**Primary Navigation:**
- Horizontal top navigation: Logo (left) + Library, Upload, Wallet (right)
- Mobile: Hamburger menu collapsing Library/Upload
- Active state: Underline or pill background

**Breadcrumbs (Optional):**
- For track detail views: Library > Album Name > Track Name

---

## Responsive Behavior

**Mobile (<768px):**
- Single-column library grid → `grid-cols-2`
- Simplified player controls (hide less essential buttons)
- Bottom sheet for upload instead of modal

**Tablet (768-1024px):**
- 3-column grid
- Full player controls visible

**Desktop (>1024px):**
- 4-5 column grid
- Enhanced hover interactions
- Sidebar navigation (optional alternative layout)

---

## Animations

**Use Sparingly - Only for Critical Feedback:**

1. **Player State Transitions:**
   - Play/Pause icon morph animation
   - Album art subtle rotation on play (optional)

2. **Card Interactions:**
   - Smooth scale on hover: `hover:scale-105 transition-transform duration-200`
   - Fade-in for play button overlay

3. **Loading States:**
   - Skeleton shimmer for cards during fetch
   - Spinner for blockchain transactions

4. **Progress Indicators:**
   - Smooth progress bar animation for upload/download
   - Countdown timer ticking animation

**Avoid:**
- Excessive parallax or scroll animations
- Auto-playing waveform visualizations
- Distracting background animations

---

## Images

**Album Art:**
- Primary visual element throughout the application
- Sizes: 
  - Grid cards: 200x200px to 300x300px (responsive)
  - Player: 64x64px (mobile), 80x80px (desktop)
  - Detail view: 400x400px to 500x500px
- Default placeholder: Music note icon on gradient background

**Hero Section:**
- **No traditional hero section** - Launch directly into music library grid
- Alternative: Featured/Recently Added horizontal carousel at top of library

**Icons:**
- Use Heroicons for consistent UI icons (play, pause, upload, wallet, etc.)
- Music-specific icons: note, waveform, timer for rental status

---

## Special Considerations

**Blockchain Integration UI:**
- Transaction pending states: Loading spinner + "Confirming on Arkiv..."
- Success states: Checkmark + "Successfully uploaded to blockchain"
- Error states: Clear error messages with retry option
- Gas/cost estimation display before transactions

**Rental Expiration Indicators:**
- Urgent (< 24h): Warning badge treatment
- Moderate (< 7 days): Info badge
- Safe (> 7 days): Subtle indicator

**Offline/Sync States:**
- Clear indication when blockchain data is loading
- Cached playback vs. live streaming indication

---

This design creates an immersive music experience that seamlessly integrates blockchain functionality, balancing streaming platform aesthetics with Web3 transparency and control.