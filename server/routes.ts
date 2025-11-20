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
      
      // In production, store nonce with expiration in session/db
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

      // Verify signature
      const recoveredAddress = verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({ error: "Invalid signature" });
      }

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
          const masterPlaylistId = await arkivClient.uploadPlaylist(playlistContent, 0);
          
          // Upload chunks to Arkiv with linked-list structure
          const arkivChunks: any[] = [];
          for (let i = 0; i < result.chunks.length; i++) {
            const chunk = result.chunks[i];
            const chunkData = await fs.readFile(chunk.filePath);
            
            // Upload to Arkiv
            const arkivEntityId = await arkivClient.uploadChunk(chunkData, 0);
            
            arkivChunks.push({
              sequence: i,
              arkivEntityId,
              sizeBytes: chunk.sizeBytes,
            });
            
            const progress = 40 + Math.floor((i / result.chunks.length) * 50);
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
            priceEth: "0.0001",
            durationSeconds: result.durationSeconds,
            category: category || "new-releases",
            createdBy: walletAddress,
          });
          
          // Save chunk metadata with linked-list structure
          for (let i = 0; i < arkivChunks.length; i++) {
            const nextChunkId = i < arkivChunks.length - 1 ? arkivChunks[i + 1].arkivEntityId : null;
            
            await storage.createCatalogChunk({
              catalogItemId: catalogItem.id,
              sequence: i,
              arkivEntityId: arkivChunks[i].arkivEntityId,
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

  // ============ Rental Routes ============
  
  /**
   * Create a rental (after payment verification)
   */
  app.post("/api/rentals", async (req, res) => {
    try {
      const { walletAddress, catalogItemId, txHash, rentalDurationDays } = req.body;
      
      if (!walletAddress || !catalogItemId || !txHash || !rentalDurationDays) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if rental already exists for this tx
      const existing = await storage.getRentalByTxHash(txHash);
      if (existing) {
        return res.status(400).json({ error: "Rental already exists for this transaction" });
      }

      // Get catalog item
      const item = await storage.getCatalogItem(catalogItemId);
      if (!item) {
        return res.status(404).json({ error: "Catalog item not found" });
      }

      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + rentalDurationDays);

      // Clone playlist and chunks for this user (simplified - in production would clone all chunks)
      let rentalPlaylistId: string | null = null;
      
      if (item.masterPlaylistId && arkivClient.isInitialized()) {
        const expirationSeconds = rentalDurationDays * 24 * 60 * 60;
        rentalPlaylistId = await arkivClient.cloneEntity(item.masterPlaylistId, expirationSeconds);
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
   */
  app.get("/api/stream/:rentalId/playlist", async (req, res) => {
    try {
      const rental = await storage.getRentalById(req.params.rentalId);
      
      if (!rental) {
        return res.status(404).json({ error: "Rental not found" });
      }

      if (!rental.isActive || rental.rentalExpiresAt < new Date()) {
        return res.status(403).json({ error: "Rental expired" });
      }

      if (!rental.rentalCopyPlaylistId) {
        return res.status(404).json({ error: "Playlist not available" });
      }

      // Fetch playlist from Arkiv
      const playlistContent = await arkivClient.fetchPlaylist(rental.rentalCopyPlaylistId);
      
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(playlistContent);
    } catch (error) {
      console.error("Playlist fetch error:", error);
      res.status(500).json({ error: "Failed to fetch playlist" });
    }
  });

  /**
   * Serve HLS chunk for a rental
   */
  app.get("/api/stream/:rentalId/chunk/:sequence", async (req, res) => {
    try {
      const rental = await storage.getRentalById(req.params.rentalId);
      
      if (!rental || !rental.isActive || rental.rentalExpiresAt < new Date()) {
        return res.status(403).json({ error: "Access denied" });
      }

      const sequence = parseInt(req.params.sequence);
      const chunks = await storage.getCatalogChunksBySequence(rental.catalogItemId);
      const chunk = chunks.find(c => c.sequence === sequence);
      
      if (!chunk) {
        return res.status(404).json({ error: "Chunk not found" });
      }

      // Fetch chunk data from Arkiv
      const chunkData = await arkivClient.fetchChunk(chunk.arkivEntityId);
      
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
