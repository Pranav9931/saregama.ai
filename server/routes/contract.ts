import type { Express } from "express";
import { contractClient } from "../lib/contract";
import { storage } from "../storage";
import { ethers } from "ethers";

export function registerContractRoutes(app: Express) {
  
  /**
   * Admin: Sync catalog item to smart contract
   * Uses server-side private key for automatic syncing
   */
  app.post("/api/admin/contract/sync-catalog-item/:catalogItemId", async (req, res) => {
    try {
      const { catalogItemId } = req.params;
      
      const ownerPrivateKey = process.env.ARKIV_PRIVATE_KEY;
      if (!ownerPrivateKey) {
        return res.status(500).json({ error: "Contract owner private key not configured" });
      }

      // Get catalog item from database
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      if (!catalogItem) {
        return res.status(404).json({ error: "Catalog item not found in database" });
      }

      // Check if already on contract
      const onChainItem = await contractClient.getCatalogItem(catalogItemId);
      if (onChainItem.catalogItemId) {
        return res.json({
          success: true,
          message: "Catalog item already exists on contract",
          txHash: null,
        });
      }

      // Add to contract
      const priceWei = ethers.parseEther(catalogItem.priceEth).toString();
      const receipt = await contractClient.addCatalogItem(
        catalogItemId,
        catalogItem.createdBy,
        priceWei,
        catalogItem.rentalDurationDays,
        ownerPrivateKey
      );

      res.json({
        success: true,
        message: "Catalog item added to contract",
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (error) {
      console.error("Failed to sync catalog item to contract:", error);
      res.status(500).json({ 
        error: "Failed to sync catalog item to contract",
        details: String(error)
      });
    }
  });

  /**
   * Admin: Sync all catalog items to smart contract
   */
  app.post("/api/admin/contract/sync-all-catalog-items", async (req, res) => {
    try {
      const ownerPrivateKey = process.env.ARKIV_PRIVATE_KEY;
      if (!ownerPrivateKey) {
        return res.status(500).json({ error: "Contract owner private key not configured" });
      }

      // Get all catalog items
      const catalogItems = await storage.getCatalogItems();
      
      const results = [];
      for (const item of catalogItems) {
        try {
          // Check if already on contract
          const onChainItem = await contractClient.getCatalogItem(item.id);
          if (onChainItem.catalogItemId) {
            results.push({
              catalogItemId: item.id,
              status: "already_synced",
              title: item.title,
            });
            continue;
          }

          // Add to contract
          const priceWei = ethers.parseEther(item.priceEth).toString();
          const receipt = await contractClient.addCatalogItem(
            item.id,
            item.createdBy,
            priceWei,
            item.rentalDurationDays,
            ownerPrivateKey
          );

          results.push({
            catalogItemId: item.id,
            status: "synced",
            title: item.title,
            txHash: receipt.hash,
          });
        } catch (error) {
          results.push({
            catalogItemId: item.id,
            status: "failed",
            title: item.title,
            error: String(error),
          });
        }
      }

      const synced = results.filter(r => r.status === "synced").length;
      const alreadySynced = results.filter(r => r.status === "already_synced").length;
      const failed = results.filter(r => r.status === "failed").length;

      res.json({
        success: true,
        summary: {
          total: catalogItems.length,
          synced,
          alreadySynced,
          failed,
        },
        results,
      });
    } catch (error) {
      console.error("Failed to sync all catalog items:", error);
      res.status(500).json({ 
        error: "Failed to sync all catalog items",
        details: String(error)
      });
    }
  });

  /**
   * Add catalog item to smart contract (owner only)
   * This should be called after a catalog item is created in the database
   */
  app.post("/api/contract/catalog/add", async (req, res) => {
    try {
      const { catalogItemId, artistAddress, priceWei, rentalDurationDays, ownerPrivateKey } = req.body;
      
      if (!catalogItemId || !artistAddress || !priceWei || !rentalDurationDays) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!ownerPrivateKey) {
        return res.status(400).json({ error: "Owner private key required" });
      }

      const receipt = await contractClient.addCatalogItem(
        catalogItemId,
        artistAddress,
        priceWei,
        rentalDurationDays,
        ownerPrivateKey
      );

      res.json({
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (error) {
      console.error("Failed to add catalog item to contract:", error);
      res.status(500).json({ 
        error: "Failed to add catalog item to contract",
        details: String(error)
      });
    }
  });

  /**
   * Update catalog item on smart contract (owner only)
   */
  app.post("/api/contract/catalog/update", async (req, res) => {
    try {
      const { catalogItemId, priceWei, rentalDurationDays, isActive, ownerPrivateKey } = req.body;
      
      if (!catalogItemId || !priceWei || !rentalDurationDays || isActive === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!ownerPrivateKey) {
        return res.status(400).json({ error: "Owner private key required" });
      }

      const receipt = await contractClient.updateCatalogItem(
        catalogItemId,
        priceWei,
        rentalDurationDays,
        isActive,
        ownerPrivateKey
      );

      res.json({
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });
    } catch (error) {
      console.error("Failed to update catalog item on contract:", error);
      res.status(500).json({ 
        error: "Failed to update catalog item on contract",
        details: String(error)
      });
    }
  });

  /**
   * Get catalog item from smart contract
   */
  app.get("/api/contract/catalog/:catalogItemId", async (req, res) => {
    try {
      const { catalogItemId } = req.params;
      
      const item = await contractClient.getCatalogItem(catalogItemId);
      
      if (!item.catalogItemId) {
        return res.status(404).json({ error: "Catalog item not found on contract" });
      }

      res.json(item);
    } catch (error) {
      console.error("Failed to get catalog item from contract:", error);
      res.status(500).json({ 
        error: "Failed to get catalog item from contract",
        details: String(error)
      });
    }
  });

  /**
   * Create rental transaction via Crossmint API
   * This creates a transaction that the Crossmint wallet can sign
   */
  app.post("/api/contract/rentals/create-transaction", async (req, res) => {
    try {
      const { walletAddress, catalogItemId, priceWei } = req.body;
      
      if (!walletAddress || !catalogItemId || !priceWei) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const CROSSMINT_API_KEY = process.env.VITE_CROSSMINT_SERVER_API_KEY;
      if (!CROSSMINT_API_KEY) {
        return res.status(500).json({ error: "Crossmint API key not configured" });
      }

      // Get catalog item to verify it exists
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      if (!catalogItem) {
        return res.status(404).json({ error: "Catalog item not found" });
      }

      // Import contract ABI and address
      const { CONTRACT_ADDRESS, CONTRACT_ABI } = await import("@shared/contract");

      // Create transaction via Crossmint API (v1-alpha2)
      const crossmintApiUrl = `https://staging.crossmint.com/api/v1-alpha2/wallets/${walletAddress}/transactions`;

      const txResponse = await fetch(crossmintApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": CROSSMINT_API_KEY,
        },
        body: JSON.stringify({
          walletType: "evm-smart-wallet",
          params: {
            chain: "ethereum-sepolia",
            calls: [{
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: "purchaseRental",
              args: [catalogItemId],
              value: priceWei,
            }],
          }
        }),
      });

      const txData = await txResponse.json();

      if (!txResponse.ok) {
        console.error("Crossmint API error:", txData);
        return res.status(txResponse.status).json({ 
          error: "Failed to create transaction",
          details: txData
        });
      }

      res.json({
        transactionId: txData.id,
        status: txData.status,
        approvals: txData.approvals,
      });
    } catch (error) {
      console.error("Failed to create rental transaction:", error);
      res.status(500).json({ 
        error: "Failed to create rental transaction",
        details: String(error)
      });
    }
  });

  /**
   * Verify rental transaction and create rental in database
   * This verifies an on-chain rental purchase and creates the rental record
   */
  app.post("/api/contract/rentals/verify", async (req, res) => {
    try {
      const { txHash, walletAddress, catalogItemId: expectedCatalogItemId } = req.body;
      
      if (!txHash || !walletAddress) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if rental already exists for this tx
      const existing = await storage.getRentalByTxHash(txHash);
      if (existing) {
        return res.json({ 
          rental: existing,
          message: "Rental already exists for this transaction"
        });
      }

      // Get transaction receipt from blockchain
      const provider = contractClient.getProvider();
      const receipt = await provider.getTransactionReceipt(txHash);
      
      if (!receipt) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (!receipt.status) {
        return res.status(400).json({ error: "Transaction failed" });
      }

      // Log transaction details for debugging
      console.log("Transaction receipt:", {
        to: receipt.to,
        from: receipt.from,
        contractAddress: contractClient.getContractAddress(),
        logs: receipt.logs.length,
      });

      // Verify transaction is to our contract OR has logs from our contract
      // (Crossmint may use a relay, so we check logs as well)
      const isDirectCall = receipt.to?.toLowerCase() === contractClient.getContractAddress().toLowerCase();
      const hasContractLogs = receipt.logs.some(log => 
        log.address?.toLowerCase() === contractClient.getContractAddress().toLowerCase()
      );

      if (!isDirectCall && !hasContractLogs) {
        return res.status(400).json({ 
          error: "Transaction is not for our contract",
          details: {
            txTo: receipt.to,
            expectedContract: contractClient.getContractAddress(),
            hasLogs: receipt.logs.length > 0
          }
        });
      }

      // Parse events to find RentalPurchased event
      const contract = contractClient.getContract();
      const rentalPurchasedEvent = receipt.logs.find((log) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "RentalPurchased";
        } catch {
          return false;
        }
      });

      if (!rentalPurchasedEvent) {
        return res.status(400).json({ error: "No rental purchase found in transaction" });
      }

      const parsed = contract.interface.parseLog(rentalPurchasedEvent);
      if (!parsed) {
        return res.status(400).json({ error: "Failed to parse rental event" });
      }

      const rentalId = parsed.args[0];
      const catalogItemId = parsed.args[1];
      const renter = parsed.args[2];
      const paidAmount = parsed.args[3];
      const rentalEndTime = parsed.args[4];

      console.log("Rental event parsed:", {
        rentalId: rentalId.toString(),
        catalogItemId,
        renter,
        paidAmount: paidAmount.toString(),
        rentalEndTime: rentalEndTime.toString(),
        expectedCatalogItemId,
      });

      // Verify the renter matches the wallet address
      if (renter.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ error: "Wallet address does not match renter" });
      }

      // Verify the catalog item matches the expected one
      if (expectedCatalogItemId && catalogItemId !== expectedCatalogItemId) {
        console.error("Catalog item mismatch:", {
          received: catalogItemId,
          expected: expectedCatalogItemId,
          match: catalogItemId === expectedCatalogItemId,
        });
        return res.status(400).json({ 
          error: "Catalog item mismatch",
          details: {
            received: catalogItemId,
            expected: expectedCatalogItemId,
          }
        });
      }

      // Get catalog item from database and verify it exists
      const catalogItem = await storage.getCatalogItem(catalogItemId);
      if (!catalogItem) {
        return res.status(404).json({ error: "Catalog item not found in database" });
      }

      // Get on-chain catalog item to verify price
      const onChainItem = await contractClient.getCatalogItem(catalogItemId);
      if (!onChainItem.catalogItemId) {
        return res.status(404).json({ error: "Catalog item not found on contract" });
      }

      // Verify the paid amount matches or exceeds the on-chain price
      if (paidAmount < BigInt(onChainItem.priceWei)) {
        return res.status(400).json({ error: "Paid amount is less than required price" });
      }

      // Ensure user has a profile
      let profile = await storage.getProfile(walletAddress);
      if (!profile) {
        profile = await storage.createProfile({
          walletAddress,
          displayName: null,
          avatarUrl: null,
        });
      }

      // Calculate rental duration
      const rentalStartTime = Math.floor(Date.now() / 1000);
      const rentalDurationSeconds = Number(rentalEndTime) - rentalStartTime;
      const rentalDurationDays = Math.ceil(rentalDurationSeconds / (24 * 60 * 60));

      // Create rental expiration date
      const expiresAt = new Date(Number(rentalEndTime) * 1000);

      // Clone playlist for this rental if available
      let rentalPlaylistId: string | null = null;
      if (catalogItem.masterPlaylistId) {
        try {
          const { arkivClient } = await import("../lib/arkiv");
          if (arkivClient.isInitialized()) {
            const { entityKey } = await arkivClient.cloneEntity(
              catalogItem.masterPlaylistId, 
              rentalDurationSeconds
            );
            rentalPlaylistId = entityKey;
          }
        } catch (error) {
          console.error("Failed to clone playlist:", error);
        }
      }

      // Create rental record
      const rental = await storage.createUserRental({
        walletAddress,
        catalogItemId,
        rentalCopyPlaylistId: rentalPlaylistId,
        rentalExpiresAt: expiresAt,
        txHash,
        rentalDurationDays,
        paidEth: ethers.formatEther(paidAmount),
      });

      res.json({
        rental,
        onChainData: {
          rentalId: rentalId.toString(),
          paidAmount: paidAmount.toString(),
          rentalEndTime: Number(rentalEndTime),
        }
      });
    } catch (error) {
      console.error("Failed to verify rental transaction:", error);
      res.status(500).json({ 
        error: "Failed to verify rental transaction",
        details: String(error)
      });
    }
  });

  /**
   * Get user's on-chain rentals
   */
  app.get("/api/contract/rentals/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      
      const rentalIds = await contractClient.getUserRentals(walletAddress);
      
      const rentals = await Promise.all(
        rentalIds.map(async (rentalId: string) => {
          const rental = await contractClient.getRental(rentalId);
          const status = await contractClient.getRentalStatus(rentalId);
          return {
            rentalId,
            ...rental,
            status,
          };
        })
      );

      res.json(rentals);
    } catch (error) {
      console.error("Failed to get user rentals from contract:", error);
      res.status(500).json({ 
        error: "Failed to get user rentals from contract",
        details: String(error)
      });
    }
  });

  /**
   * Get rental status from smart contract
   */
  app.get("/api/contract/rental/:rentalId/status", async (req, res) => {
    try {
      const { rentalId } = req.params;
      
      const status = await contractClient.getRentalStatus(rentalId);
      
      res.json(status);
    } catch (error) {
      console.error("Failed to get rental status from contract:", error);
      res.status(500).json({ 
        error: "Failed to get rental status from contract",
        details: String(error)
      });
    }
  });

  /**
   * Get contract information
   */
  app.get("/api/contract/info", async (req, res) => {
    try {
      const [owner, feePercentage, feeRecipient] = await Promise.all([
        contractClient.getOwner(),
        contractClient.getPlatformFeePercentage(),
        contractClient.getPlatformFeeRecipient(),
      ]);

      res.json({
        contractAddress: contractClient.getContractAddress(),
        owner,
        platformFeePercentage: feePercentage,
        platformFeeRecipient: feeRecipient,
      });
    } catch (error) {
      console.error("Failed to get contract info:", error);
      res.status(500).json({ 
        error: "Failed to get contract info",
        details: String(error)
      });
    }
  });
}
