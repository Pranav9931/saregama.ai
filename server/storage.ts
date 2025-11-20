import { 
  type User, 
  type InsertUser,
  type Profile,
  type InsertProfile,
  type CatalogItem,
  type InsertCatalogItem,
  type CatalogChunk,
  type InsertCatalogChunk,
  type UserRental,
  type InsertUserRental,
  type UploadJob,
  type InsertUploadJob,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Legacy user methods (can be removed if not needed)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Profile methods
  getProfile(walletAddress: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(walletAddress: string, updates: Partial<InsertProfile>): Promise<Profile>;

  // Catalog items methods
  getCatalogItem(id: string): Promise<CatalogItem | undefined>;
  getCatalogItems(filters?: { type?: string; category?: string }): Promise<CatalogItem[]>;
  getCatalogItemsByCreator(walletAddress: string): Promise<CatalogItem[]>;
  createCatalogItem(item: InsertCatalogItem): Promise<CatalogItem>;
  updateCatalogItem(id: string, updates: Partial<InsertCatalogItem>): Promise<CatalogItem>;

  // Catalog chunks methods
  getCatalogChunks(catalogItemId: string): Promise<CatalogChunk[]>;
  getCatalogChunksBySequence(catalogItemId: string): Promise<CatalogChunk[]>;
  createCatalogChunk(chunk: InsertCatalogChunk): Promise<CatalogChunk>;
  getChunkByArkivId(arkivEntityId: string): Promise<CatalogChunk | undefined>;

  // User rentals methods
  getUserRentals(walletAddress: string): Promise<UserRental[]>;
  getActiveRentals(walletAddress: string): Promise<UserRental[]>;
  getRentalById(id: string): Promise<UserRental | undefined>;
  getRentalByTxHash(txHash: string): Promise<UserRental | undefined>;
  createUserRental(rental: InsertUserRental): Promise<UserRental>;
  expireRental(id: string): Promise<void>;
  checkRentalAccess(walletAddress: string, catalogItemId: string): Promise<UserRental | undefined>;

  // Upload jobs methods
  getUploadJob(id: string): Promise<UploadJob | undefined>;
  createUploadJob(job: InsertUploadJob): Promise<UploadJob>;
  updateUploadJob(id: string, updates: Partial<UploadJob>): Promise<UploadJob>;
  getUploadJobsByWallet(walletAddress: string): Promise<UploadJob[]>;

  // Nonce methods for auth replay protection
  storeNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<void>;
  getNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: Date } | undefined>;
  deleteNonce(walletAddress: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private profiles: Map<string, Profile>;
  private catalogItems: Map<string, CatalogItem>;
  private catalogChunks: Map<string, CatalogChunk>;
  private userRentals: Map<string, UserRental>;
  private uploadJobs: Map<string, UploadJob>;
  private nonces: Map<string, { nonce: string; expiresAt: Date }>;

  constructor() {
    this.users = new Map();
    this.profiles = new Map();
    this.catalogItems = new Map();
    this.catalogChunks = new Map();
    this.userRentals = new Map();
    this.uploadJobs = new Map();
    this.nonces = new Map();
  }

  // Legacy user methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Profile methods
  async getProfile(walletAddress: string): Promise<Profile | undefined> {
    return this.profiles.get(walletAddress.toLowerCase());
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      walletAddress: insertProfile.walletAddress.toLowerCase(),
      displayName: insertProfile.displayName ?? null,
      avatarUrl: insertProfile.avatarUrl ?? null,
      createdAt: new Date(),
    };
    this.profiles.set(profile.walletAddress, profile);
    return profile;
  }

  async updateProfile(walletAddress: string, updates: Partial<InsertProfile>): Promise<Profile> {
    const existing = await this.getProfile(walletAddress);
    if (!existing) {
      throw new Error("Profile not found");
    }
    const updated = { ...existing, ...updates };
    this.profiles.set(walletAddress.toLowerCase(), updated);
    return updated;
  }

  // Catalog items methods
  async getCatalogItem(id: string): Promise<CatalogItem | undefined> {
    return this.catalogItems.get(id);
  }

  async getCatalogItems(filters?: { type?: string; category?: string }): Promise<CatalogItem[]> {
    let items = Array.from(this.catalogItems.values());
    if (filters?.type) {
      items = items.filter((item) => item.type === filters.type);
    }
    if (filters?.category) {
      items = items.filter((item) => item.category === filters.category);
    }
    return items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCatalogItemsByCreator(walletAddress: string): Promise<CatalogItem[]> {
    return Array.from(this.catalogItems.values()).filter(
      (item) => item.createdBy.toLowerCase() === walletAddress.toLowerCase()
    );
  }

  async createCatalogItem(insertItem: InsertCatalogItem): Promise<CatalogItem> {
    const id = randomUUID();
    const item: CatalogItem = {
      id,
      type: insertItem.type,
      title: insertItem.title,
      artist: insertItem.artist,
      description: insertItem.description ?? null,
      coverUrl: insertItem.coverUrl ?? null,
      masterPlaylistId: insertItem.masterPlaylistId ?? null,
      priceEth: insertItem.priceEth ?? "0.0001",
      durationSeconds: insertItem.durationSeconds,
      category: insertItem.category ?? null,
      createdBy: insertItem.createdBy,
      createdAt: new Date(),
    };
    this.catalogItems.set(id, item);
    return item;
  }

  async updateCatalogItem(id: string, updates: Partial<InsertCatalogItem>): Promise<CatalogItem> {
    const existing = await this.getCatalogItem(id);
    if (!existing) {
      throw new Error("Catalog item not found");
    }
    const updated = { ...existing, ...updates };
    this.catalogItems.set(id, updated);
    return updated;
  }

  // Catalog chunks methods
  async getCatalogChunks(catalogItemId: string): Promise<CatalogChunk[]> {
    return Array.from(this.catalogChunks.values()).filter(
      (chunk) => chunk.catalogItemId === catalogItemId
    );
  }

  async getCatalogChunksBySequence(catalogItemId: string): Promise<CatalogChunk[]> {
    const chunks = await this.getCatalogChunks(catalogItemId);
    return chunks.sort((a, b) => a.sequence - b.sequence);
  }

  async createCatalogChunk(insertChunk: InsertCatalogChunk): Promise<CatalogChunk> {
    const id = randomUUID();
    const chunk: CatalogChunk = {
      id,
      catalogItemId: insertChunk.catalogItemId,
      sequence: insertChunk.sequence,
      arkivEntityId: insertChunk.arkivEntityId,
      nextChunkId: insertChunk.nextChunkId ?? null,
      sizeBytes: insertChunk.sizeBytes,
      expiresAt: insertChunk.expiresAt ?? null,
      createdAt: new Date(),
    };
    this.catalogChunks.set(id, chunk);
    return chunk;
  }

  async getChunkByArkivId(arkivEntityId: string): Promise<CatalogChunk | undefined> {
    return Array.from(this.catalogChunks.values()).find(
      (chunk) => chunk.arkivEntityId === arkivEntityId
    );
  }

  // User rentals methods
  async getUserRentals(walletAddress: string): Promise<UserRental[]> {
    return Array.from(this.userRentals.values()).filter(
      (rental) => rental.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  }

  async getActiveRentals(walletAddress: string): Promise<UserRental[]> {
    const now = new Date();
    return Array.from(this.userRentals.values()).filter(
      (rental) =>
        rental.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        rental.isActive &&
        rental.rentalExpiresAt > now
    );
  }

  async getRentalById(id: string): Promise<UserRental | undefined> {
    return this.userRentals.get(id);
  }

  async getRentalByTxHash(txHash: string): Promise<UserRental | undefined> {
    return Array.from(this.userRentals.values()).find(
      (rental) => rental.txHash === txHash
    );
  }

  async createUserRental(insertRental: InsertUserRental): Promise<UserRental> {
    const id = randomUUID();
    const rental: UserRental = {
      id,
      walletAddress: insertRental.walletAddress,
      catalogItemId: insertRental.catalogItemId,
      rentalCopyPlaylistId: insertRental.rentalCopyPlaylistId ?? null,
      rentalExpiresAt: insertRental.rentalExpiresAt,
      txHash: insertRental.txHash,
      rentalDurationDays: insertRental.rentalDurationDays,
      paidEth: insertRental.paidEth,
      createdAt: new Date(),
      isActive: true,
    };
    this.userRentals.set(id, rental);
    return rental;
  }

  async expireRental(id: string): Promise<void> {
    const rental = await this.getRentalById(id);
    if (rental) {
      rental.isActive = false;
      this.userRentals.set(id, rental);
    }
  }

  async checkRentalAccess(
    walletAddress: string,
    catalogItemId: string
  ): Promise<UserRental | undefined> {
    const now = new Date();
    return Array.from(this.userRentals.values()).find(
      (rental) =>
        rental.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
        rental.catalogItemId === catalogItemId &&
        rental.isActive &&
        rental.rentalExpiresAt > now
    );
  }

  // Upload jobs methods
  async getUploadJob(id: string): Promise<UploadJob | undefined> {
    return this.uploadJobs.get(id);
  }

  async createUploadJob(insertJob: InsertUploadJob): Promise<UploadJob> {
    const id = randomUUID();
    const job: UploadJob = {
      id,
      walletAddress: insertJob.walletAddress,
      fileName: insertJob.fileName,
      fileSize: insertJob.fileSize,
      status: insertJob.status ?? "processing",
      progress: insertJob.progress ?? 0,
      errorMessage: insertJob.errorMessage ?? null,
      catalogItemId: insertJob.catalogItemId ?? null,
      createdAt: new Date(),
      completedAt: null,
    };
    this.uploadJobs.set(id, job);
    return job;
  }

  async updateUploadJob(id: string, updates: Partial<UploadJob>): Promise<UploadJob> {
    const existing = await this.getUploadJob(id);
    if (!existing) {
      throw new Error("Upload job not found");
    }
    const updated = { ...existing, ...updates };
    this.uploadJobs.set(id, updated);
    return updated;
  }

  async getUploadJobsByWallet(walletAddress: string): Promise<UploadJob[]> {
    return Array.from(this.uploadJobs.values()).filter(
      (job) => job.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  }

  // Nonce methods
  async storeNonce(walletAddress: string, nonce: string, expiresAt: Date): Promise<void> {
    this.nonces.set(walletAddress.toLowerCase(), { nonce, expiresAt });
  }

  async getNonce(walletAddress: string): Promise<{ nonce: string; expiresAt: Date } | undefined> {
    const stored = this.nonces.get(walletAddress.toLowerCase());
    if (!stored) return undefined;
    
    // Check if expired
    if (stored.expiresAt < new Date()) {
      this.nonces.delete(walletAddress.toLowerCase());
      return undefined;
    }
    
    return stored;
  }

  async deleteNonce(walletAddress: string): Promise<void> {
    this.nonces.delete(walletAddress.toLowerCase());
  }
}

export const storage = new MemStorage();
