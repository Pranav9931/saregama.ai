import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { arkivClient } from "./lib/arkiv";
import { convertToHLS, cleanup } from "./lib/ffmpeg";
import { promises as fs } from 'fs';
import path from 'path';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { verifyMessage } from 'ethers';

// Configure multer for file uploads
const upload = multer({ dest: '/tmp/uploads/' });

export async function registerRoutes(app: Express): Promise<Server> {
  // ============ Auth Routes ============
  
  /**
   * Generate nonce for wallet signature
   */
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      const { walletAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ error: "Wallet address required" });
      }

      const nonce = `Sign this message to authenticate with Arkiv Music: ${Date.now()}`;
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute expiration
      
      // Store nonce with expiration for replay protection
      await storage.storeNonce(walletAddress, nonce, expiresAt);
      
      res.json({ nonce });
    } catch (error) {
      console.error("Nonce generation error:", error);
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  /**
   * Verify wallet signature and create/login profile
   */
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { walletAddress, signature, message } = req.body;
      
      if (!walletAddress || !signature || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify nonce exists and matches
      const storedNonce = await storage.getNonce(walletAddress);
      if (!storedNonce || storedNonce.nonce !== message) {
        return res.status(401).json({ error: "Invalid or expired nonce" });
      }

      // Check nonce expiration
      if (storedNonce.expiresAt < new Date()) {
        await storage.deleteNonce(walletAddress);
        return res.status(401).json({ error: "Nonce has expired" });
      }

      // Verify signature
      const recoveredAddress = verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({ error: "Invalid signature" });
      }

      // Delete used nonce to prevent replay
      await storage.deleteNonce(walletAddress);

      // Get or create profile
      let profile = await storage.getProfile(walletAddress);
      
      if (!profile) {
        profile = await storage.createProfile({
          walletAddress,
          displayName: `User ${walletAddress.slice(0, 6)}`,
          avatarUrl: null,
        });
      }

      res.json({ profile, authenticated: true });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // ============ Profile Routes ============
  
  app.get("/api/profile/:walletAddress", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.walletAddress);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/profile/:walletAddress", async (req, res) => {
    try {
      const { displayName, avatarUrl } = req.body;
      const updated = await storage.updateProfile(req.params.walletAddress, {
        displayName,
        avatarUrl,
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // ============ Catalog Routes ============
  
  /**
   * Get all catalog items with optional filters
   */
  app.get("/api/catalog", async (req, res) => {
    try {
      const { type, category } = req.query;
      const items = await storage.getCatalogItems({
        type: type as string | undefined,
        category: category as string | undefined,
      });
      res.json(items);
    } catch (error) {
      console.error("Catalog fetch error:", error);
      res.status(500).json({ error: "Failed to fetch catalog" });
    }
  });

  /**
   * Get single catalog item by ID
   */
  app.get("/api/catalog/:id", async (req, res) => {
    try {
      const item = await storage.getCatalogItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }

      // Get chunk count
      const chunks = await storage.getCatalogChunks(item.id);
      
      res.json({ ...item, chunkCount: chunks.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch item" });
    }
  });

  /**
   * Get catalog chunks with transaction details
   */
  app.get("/api/catalog/:id/chunks", async (req, res) => {
    try {
      const chunks = await storage.getCatalogChunksBySequence(req.params.id);
      res.json(chunks);
    } catch (error) {
      console.error("Failed to fetch chunks:", error);
      res.status(500).json({ error: "Failed to fetch chunks" });
    }
  });

  // ============ Upload Routes ============
  
  /**
   * Upload and process media file
   */
  app.post("/api/uploads", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { walletAddress, title, artist, category, type } = req.body;
      
      if (!walletAddress || !title || !artist || !type) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const jobId = nanoid();
      const outputDir = `/tmp/hls_${jobId}`;

      // Create upload job
      const job = await storage.createUploadJob({
        walletAddress,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        status: "processing",
        progress: 0,
      });

      // Process asynchronously
      (async () => {
        try {
          await storage.updateUploadJob(job.id, { status: "chunking", progress: 10 });
          
          // Convert to HLS
          const result = await convertToHLS(req.file!.path, outputDir);
          
          await storage.updateUploadJob(job.id, { status: "uploading", progress: 40 });
          
          // Upload playlist to Arkiv
          const playlistContent = await fs.readFile(result.playlistPath, 'utf-8');
          const { entityKey: masterPlaylistId, txHash: masterPlaylistTxHash } = await arkivClient.uploadPlaylist(playlistContent, 0);
          
          // Upload chunks to Arkiv with linked-list structure
          const arkivChunks: any[] = [];
          
          // Step 1: Upload binary chunk data
          for (let i = 0; i < result.chunks.length; i++) {
            const chunk = result.chunks[i];
            const chunkData = await fs.readFile(chunk.filePath);
            
            // Upload binary data to Arkiv
            const { entityKey: arkivEntityId, txHash: arkivTxHash } = await arkivClient.uploadChunk(chunkData, 0);
            
            arkivChunks.push({
              sequence: i,
              arkivEntityId,
              arkivTxHash,
              sizeBytes: chunk.sizeBytes,
              metadataEntityId: null, // Will be set in step 2
            });
            
            const progress = 40 + Math.floor((i / result.chunks.length) * 30);
            await storage.updateUploadJob(job.id, { progress });
          }
          
          // Step 2: Create metadata entities with linked-list structure
          // Process in REVERSE order so each metadata entity can point to the next one (already created)
          let nextMetadataId: string | null = null;
          for (let i = arkivChunks.length - 1; i >= 0; i--) {
            const currentChunk = arkivChunks[i];
            
            // Upload metadata entity containing {entityId, dataEntityId, nextBlockId}
            // nextBlockId points to the NEXT metadata entity ID (not binary chunk ID)
            const { entityKey: metadataEntityId } = await arkivClient.uploadChunkMetadata({
              entityId: currentChunk.arkivEntityId,
              dataEntityId: currentChunk.arkivEntityId,
              nextBlockId: nextMetadataId, // Points to next metadata entity (or null for last chunk)
            }, 0);
            
            arkivChunks[i].metadataEntityId = metadataEntityId;
            nextMetadataId = metadataEntityId; // This becomes the next chunk's nextBlockId
            
            const progress = 70 + Math.floor(((arkivChunks.length - i) / arkivChunks.length) * 20);
            await storage.updateUploadJob(job.id, { progress });
          }
          
          // Create catalog item
          const catalogItem = await storage.createCatalogItem({
            type: type as "audio" | "video",
            title,
            artist,
            description: req.body.description || null,
            coverUrl: req.body.coverUrl || null,
            masterPlaylistId,
            masterPlaylistTxHash,
            priceEth: "0.0001",
            durationSeconds: result.durationSeconds,
            category: category || "new-releases",
            createdBy: walletAddress,
          });
          
          // Save chunk metadata with linked-list structure
          for (let i = 0; i < arkivChunks.length; i++) {
            // nextChunkId should point to the next chunk's METADATA entity ID (not binary arkivEntityId)
            const nextChunkId = i < arkivChunks.length - 1 ? arkivChunks[i + 1].metadataEntityId : null;
            
            await storage.createCatalogChunk({
              catalogItemId: catalogItem.id,
              sequence: i,
              arkivEntityId: arkivChunks[i].arkivEntityId,
              arkivTxHash: arkivChunks[i].arkivTxHash,
              metadataEntityId: arkivChunks[i].metadataEntityId,
              nextChunkId,
              sizeBytes: arkivChunks[i].sizeBytes,
              expiresAt: null, // Master chunks don't expire
            });
          }
          
          // Mark job complete
          await storage.updateUploadJob(job.id, {
            status: "completed",
            progress: 100,
            catalogItemId: catalogItem.id,
            completedAt: new Date(),
          });
          
          // Cleanup
          await cleanup(outputDir);
          await fs.unlink(req.file!.path);
          
          console.log(`✅ Upload complete: ${catalogItem.id}`);
        } catch (error) {
          console.error("Upload processing error:", error);
          await storage.updateUploadJob(job.id, {
            status: "failed",
            errorMessage: String(error),
          });
        }
      })();

      res.json({ jobId: job.id, message: "Upload processing started" });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  /**
   * Get upload job status
   */
  app.get("/api/uploads/:jobId", async (req, res) => {
    try {
      const job = await storage.getUploadJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  /**
   * Get all upload jobs for a wallet
   */
  app.get("/api/uploads/wallet/:walletAddress", async (req, res) => {
    try {
      const jobs = await storage.getUploadJobsByWallet(req.params.walletAddress);
      res.json(jobs);
    } catch (error) {
      console.error("Failed to fetch upload jobs:", error);
      res.status(500).json({ error: "Failed to fetch upload jobs" });
    }
  });

  // ============ Rental Routes ============
  
  /**
   * Create a rental (after payment verification)
   * NOTE: In production, validate txHash on-chain via Web3 provider
   * For demo purposes, we accept mock transaction hashes
   */
  app.post("/api/rentals", async (req, res) => {
    try {
      const { walletAddress, catalogItemId, txHash, rentalDurationDays } = req.body;
      
      if (!walletAddress || !catalogItemId || !txHash || !rentalDurationDays) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate catalog item exists
      const item = await storage.getCatalogItem(catalogItemId);
      if (!item) {
        return res.status(404).json({ error: "Catalog item not found" });
      }

      // Verify item is available for rental (has master playlist)
      if (!item.masterPlaylistId) {
        return res.status(400).json({ error: "Item not available for rental" });
      }

      // Check if rental already exists for this tx (prevent duplicates)
      const existing = await storage.getRentalByTxHash(txHash);
      if (existing) {
        return res.status(400).json({ error: "Rental already exists for this transaction" });
      }

      // TODO: In production, verify payment on-chain:
      // - Validate txHash exists on blockchain
      // - Check transaction value matches item.priceEth
      // - Verify transaction is to our payment address
      // - Confirm transaction has sufficient confirmations

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rentalDurationDays);

      // Clone playlist and chunks for this user (simplified - in production would clone all chunks)
      let rentalPlaylistId: string | null = null;
      
      if (item.masterPlaylistId && arkivClient.isInitialized()) {
        const expirationSeconds = rentalDurationDays * 24 * 60 * 60;
        const { entityKey } = await arkivClient.cloneEntity(item.masterPlaylistId, expirationSeconds);
        rentalPlaylistId = entityKey;
      }

      // Create rental record
      const rental = await storage.createUserRental({
        walletAddress,
        catalogItemId,
        rentalCopyPlaylistId: rentalPlaylistId,
        rentalExpiresAt: expiresAt,
        txHash,
        rentalDurationDays,
        paidEth: item.priceEth,
      });

      res.json(rental);
    } catch (error) {
      console.error("Rental creation error:", error);
      res.status(500).json({ error: "Failed to create rental" });
    }
  });

  /**
   * Get user's active rentals
   */
  app.get("/api/rentals/:walletAddress", async (req, res) => {
    try {
      const rentals = await storage.getActiveRentals(req.params.walletAddress);
      
      // Enrich with catalog item data
      const enrichedRentals = await Promise.all(
        rentals.map(async (rental) => {
          const item = await storage.getCatalogItem(rental.catalogItemId);
          return { ...rental, catalogItem: item };
        })
      );
      
      res.json(enrichedRentals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rentals" });
    }
  });

  // ============ Streaming Routes ============
  
  /**
   * Serve HLS playlist for a rental
   * Generates dynamic M3U8 playlist referencing backend chunk URLs
   * Requires wallet ownership verification - returns 401 if unauthorized
   */
  app.get("/api/stream/:rentalId/playlist", async (req, res) => {
    try {
      const { rentalId } = req.params;
      const { walletAddress } = req.query;

      // Require wallet address for ownership verification
      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required for authentication" });
      }

      // Fetch rental
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental) {
        return res.status(404).json({ error: "Rental not found" });
      }

      // Verify ownership - must match the wallet that created the rental
      if (rental.walletAddress.toLowerCase() !== (walletAddress as string).toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: This rental belongs to a different wallet" });
      }

      // Check rental status
      if (!rental.isActive) {
        return res.status(403).json({ error: "Rental is not active" });
      }

      // Check expiration and auto-expire if needed
      if (rental.rentalExpiresAt < new Date()) {
        await storage.expireRental(rentalId);
        return res.status(403).json({ error: "Rental has expired" });
      }

      // Get all chunks for this catalog item
      const chunks = await storage.getCatalogChunksBySequence(rental.catalogItemId);
      
      if (chunks.length === 0) {
        return res.status(404).json({ error: "No chunks found for this rental" });
      }

      // Generate dynamic M3U8 playlist with absolute URLs
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}`;
      
      const m3u8Lines = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:10',
        '#EXT-X-MEDIA-SEQUENCE:0',
        ''
      ];

      // Add each chunk as a segment with absolute URL
      for (const chunk of chunks) {
        m3u8Lines.push(`#EXTINF:10.0,`);
        m3u8Lines.push(`${baseUrl}/api/stream/${rentalId}/chunk/${chunk.sequence}?walletAddress=${walletAddress}`);
      }

      // End playlist
      m3u8Lines.push('#EXT-X-ENDLIST');
      m3u8Lines.push('');

      const playlistContent = m3u8Lines.join('\n');
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(playlistContent);
    } catch (error) {
      console.error("Playlist generation error:", error);
      res.status(500).json({ error: "Failed to generate playlist" });
    }
  });

  /**
   * Serve HLS chunk for a rental
   * Fetches chunk using metadata linked-list structure from Arkiv blockchain
   * Requires wallet ownership verification - returns 401 if unauthorized
   */
  app.get("/api/stream/:rentalId/chunk/:sequence", async (req, res) => {
    try {
      const { rentalId, sequence: sequenceStr } = req.params;
      const { walletAddress } = req.query;

      // Require wallet address for ownership verification
      if (!walletAddress) {
        return res.status(401).json({ error: "Wallet address required for authentication" });
      }

      // Fetch rental
      const rental = await storage.getRentalById(rentalId);
      
      if (!rental) {
        return res.status(404).json({ error: "Rental not found" });
      }

      // Verify ownership - must match the wallet that created the rental
      if (rental.walletAddress.toLowerCase() !== (walletAddress as string).toLowerCase()) {
        return res.status(403).json({ error: "Unauthorized: This rental belongs to a different wallet" });
      }

      // Check rental status
      if (!rental.isActive) {
        return res.status(403).json({ error: "Rental is not active" });
      }

      // Check expiration
      if (rental.rentalExpiresAt < new Date()) {
        await storage.expireRental(rentalId);
        return res.status(403).json({ error: "Rental has expired" });
      }

      // Traverse the linked-list structure using nextChunkId to find the requested chunk
      const sequence = parseInt(sequenceStr);
      const allChunks = await storage.getCatalogChunksBySequence(rental.catalogItemId);
      
      if (allChunks.length === 0) {
        return res.status(404).json({ error: "No chunks found" });
      }

      // Start with the first chunk (sequence 0)
      let currentChunk = allChunks.find(c => c.sequence === 0);
      if (!currentChunk) {
        return res.status(404).json({ error: "First chunk not found" });
      }

      // Traverse the linked-list using nextChunkId to reach the requested sequence
      let currentSequence = 0;
      while (currentSequence < sequence) {
        if (!currentChunk.nextChunkId) {
          return res.status(404).json({ error: `Chunk ${sequence} not found in linked-list` });
        }

        // Find the next chunk in the database using nextChunkId (which points to metadataEntityId)
        const nextChunk = allChunks.find(c => c.metadataEntityId === currentChunk.nextChunkId);
        if (!nextChunk) {
          return res.status(404).json({ error: `Broken linked-list at sequence ${currentSequence}` });
        }

        console.log(`[Linked-list traversal] Sequence ${currentSequence} → ${nextChunk.sequence} (nextChunkId: ${currentChunk.nextChunkId})`);
        
        currentChunk = nextChunk;
        currentSequence++;
      }

      console.log(`[Linked-list traversal] Reached target sequence ${sequence}`);

      // Fetch metadata entity from Arkiv to verify linked-list structure
      if (currentChunk.metadataEntityId) {
        try {
          const metadata = await arkivClient.fetchChunkMetadata(currentChunk.metadataEntityId);
          console.log(`[Chunk ${sequence}] Metadata from Arkiv:`, {
            entityId: metadata.entityId,
            dataEntityId: metadata.dataEntityId,
            nextBlockId: metadata.nextBlockId
          });
        } catch (metadataError) {
          console.warn(`[Chunk ${sequence}] Metadata fetch failed:`, metadataError);
        }
      }

      // Fetch binary chunk data from Arkiv using the arkivEntityId
      const chunkData = await arkivClient.fetchChunk(currentChunk.arkivEntityId);
      
      res.setHeader('Content-Type', 'video/MP2T');
      res.send(chunkData);
    } catch (error) {
      console.error("Chunk fetch error:", error);
      res.status(500).json({ error: "Failed to fetch chunk" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
