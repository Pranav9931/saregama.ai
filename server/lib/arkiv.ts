import { createWalletClient, createPublicClient, http } from "@arkiv-network/sdk";
import { privateKeyToAccount } from "@arkiv-network/sdk/accounts";
import { mendoza } from "@arkiv-network/sdk/chains";
import { stringToPayload } from "@arkiv-network/sdk/utils";

const RPC_URL = process.env.ARKIV_RPC_URL || "https://mendoza.hoodi.arkiv.network/rpc";
const PRIVATE_KEY = (process.env.ARKIV_PRIVATE_KEY || "") as `0x${string}`;

export interface ChunkData {
  entityId: string;
  data: Buffer;
  nextBlockId: string | null;
}

export interface PlaylistData {
  content: string;
  chunkEntityIds: string[];
}

/**
 * Arkiv client wrapper for blockchain storage operations
 */
export class ArkivClient {
  private walletClient: any;
  private publicClient: any;

  constructor() {
    if (!PRIVATE_KEY) {
      console.warn("⚠️  ARKIV_PRIVATE_KEY not set - using mock client");
      this.walletClient = null;
      this.publicClient = null;
    } else {
      try {
        this.walletClient = createWalletClient({
          chain: mendoza,
          transport: http(RPC_URL),
          account: privateKeyToAccount(PRIVATE_KEY),
        });

        this.publicClient = createPublicClient({
          chain: mendoza,
          transport: http(RPC_URL),
        });
        console.log("✅ Arkiv client initialized");
      } catch (error) {
        console.error("Failed to initialize Arkiv client:", error);
        this.walletClient = null;
        this.publicClient = null;
      }
    }
  }

  /**
   * Upload a single chunk to Arkiv blockchain
   * @param data Buffer containing chunk data
   * @param expiresInSeconds Expiration time in seconds (0 for very long expiration)
   * @returns Object with entityKey and txHash
   */
  async uploadChunk(
    data: Buffer,
    expiresInSeconds: number = 0
  ): Promise<{ entityKey: string; txHash: string }> {
    if (!this.walletClient) {
      // Mock mode for development
      const mockId = `mock_entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      console.log(`📦 [MOCK] Uploading chunk (${data.length} bytes) -> ${mockId}`);
      return { entityKey: mockId, txHash: mockTxHash };
    }

    try {
      // Convert Buffer to Uint8Array for Arkiv SDK
      const payload = new Uint8Array(data);
      
      const { entityKey, txHash } = await this.walletClient.createEntity({
        payload,
        contentType: 'application/octet-stream',
        attributes: [
          { key: 'type', value: 'hls-chunk' },
          { key: 'size', value: data.length.toString() },
        ],
        expiresIn: expiresInSeconds || 31536000, // 1 year if 0
      });

      console.log(`✅ Chunk uploaded to Arkiv: ${entityKey} (${data.length} bytes) - TX: ${txHash}`);
      return { entityKey, txHash };
    } catch (error) {
      console.error("Failed to upload chunk to Arkiv:", error);
      throw new Error(`Arkiv upload failed: ${error}`);
    }
  }

  /**
   * Upload playlist file to Arkiv blockchain
   * @param playlistContent M3U8 playlist content
   * @param expiresInSeconds Expiration time in seconds
   * @returns Object with entityKey and txHash
   */
  async uploadPlaylist(
    playlistContent: string,
    expiresInSeconds: number = 0
  ): Promise<{ entityKey: string; txHash: string }> {
    if (!this.walletClient) {
      // Mock mode
      const mockId = `mock_playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      console.log(`📄 [MOCK] Uploading playlist -> ${mockId}`);
      return { entityKey: mockId, txHash: mockTxHash };
    }

    try {
      const { entityKey, txHash } = await this.walletClient.createEntity({
        payload: stringToPayload(playlistContent),
        contentType: 'application/vnd.apple.mpegurl',
        attributes: [
          { key: 'type', value: 'hls-playlist' },
          { key: 'size', value: playlistContent.length.toString() },
        ],
        expiresIn: expiresInSeconds || 31536000, // 1 year if 0
      });

      console.log(`✅ Playlist uploaded to Arkiv: ${entityKey} - TX: ${txHash}`);
      return { entityKey, txHash };
    } catch (error) {
      console.error("Failed to upload playlist to Arkiv:", error);
      throw new Error(`Arkiv playlist upload failed: ${error}`);
    }
  }

  /**
   * Upload chunk metadata with linked-list structure to Arkiv
   * @param metadata Object containing {entityId, dataEntityId, nextBlockId}
   * @param expiresInSeconds Expiration time in seconds
   * @returns Object with entityKey and txHash
   */
  async uploadChunkMetadata(
    metadata: { entityId: string; dataEntityId: string; nextBlockId: string | null },
    expiresInSeconds: number = 0
  ): Promise<{ entityKey: string; txHash: string }> {
    if (!this.walletClient) {
      // Mock mode
      const mockId = `mock_metadata_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      console.log(`🔗 [MOCK] Uploading chunk metadata -> ${mockId}`);
      return { entityKey: mockId, txHash: mockTxHash };
    }

    try {
      const { entityKey, txHash } = await this.walletClient.createEntity({
        payload: stringToPayload(JSON.stringify(metadata)),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'chunk-metadata' },
          { key: 'dataEntityId', value: metadata.dataEntityId },
          { key: 'nextBlockId', value: metadata.nextBlockId || '' },
        ],
        expiresIn: expiresInSeconds || 31536000, // 1 year if 0
      });

      console.log(`✅ Chunk metadata uploaded to Arkiv: ${entityKey} - TX: ${txHash}`);
      return { entityKey, txHash };
    } catch (error) {
      console.error("Failed to upload chunk metadata to Arkiv:", error);
      throw new Error(`Arkiv metadata upload failed: ${error}`);
    }
  }

  /**
   * Fetch chunk data from Arkiv blockchain
   * @param entityKey Entity ID to fetch
   * @returns Chunk data as Buffer
   */
  async fetchChunk(entityKey: string): Promise<Buffer> {
    if (!this.publicClient) {
      // Mock mode - return empty buffer
      console.log(`📥 [MOCK] Fetching chunk: ${entityKey}`);
      return Buffer.from("mock chunk data");
    }

    try {
      const entity = await this.publicClient.getEntity(entityKey);
      const buffer = Buffer.from(entity.payload);
      console.log(`✅ Fetched chunk from Arkiv: ${entityKey} (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      console.error(`Failed to fetch chunk ${entityKey} from Arkiv:`, error);
      throw new Error(`Arkiv fetch failed: ${error}`);
    }
  }

  /**
   * Fetch chunk metadata from Arkiv blockchain
   * @param entityKey Entity ID to fetch
   * @returns Metadata object with {entityId, dataEntityId, nextBlockId}
   */
  async fetchChunkMetadata(entityKey: string): Promise<{ entityId: string; dataEntityId: string; nextBlockId: string | null }> {
    if (!this.publicClient) {
      // Mock mode
      console.log(`📥 [MOCK] Fetching chunk metadata: ${entityKey}`);
      return {
        entityId: entityKey,
        dataEntityId: `mock_data_${entityKey}`,
        nextBlockId: null
      };
    }

    try {
      const entity = await this.publicClient.getEntity(entityKey);
      const content = Buffer.from(entity.payload).toString('utf-8');
      const metadata = JSON.parse(content);
      console.log(`✅ Fetched chunk metadata from Arkiv: ${entityKey}`);
      return metadata;
    } catch (error) {
      console.error(`Failed to fetch chunk metadata ${entityKey} from Arkiv:`, error);
      throw new Error(`Arkiv metadata fetch failed: ${error}`);
    }
  }

  /**
   * Fetch playlist content from Arkiv blockchain
   * @param entityKey Entity ID to fetch
   * @returns Playlist content as string
   */
  async fetchPlaylist(entityKey: string): Promise<string> {
    if (!this.publicClient) {
      // Mock mode
      console.log(`📥 [MOCK] Fetching playlist: ${entityKey}`);
      return `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n#EXTINF:10.0,\nmock_chunk_0.ts\n#EXT-X-ENDLIST`;
    }

    try {
      const entity = await this.publicClient.getEntity(entityKey);
      const content = Buffer.from(entity.payload).toString('utf-8');
      console.log(`✅ Fetched playlist from Arkiv: ${entityKey}`);
      return content;
    } catch (error) {
      console.error(`Failed to fetch playlist ${entityKey} from Arkiv:`, error);
      throw new Error(`Arkiv playlist fetch failed: ${error}`);
    }
  }

  /**
   * Clone (copy) an entity on Arkiv blockchain with new expiration
   * @param sourceEntityKey Source entity to clone
   * @param expiresInSeconds New expiration time in seconds
   * @returns Object with entityKey and txHash
   */
  async cloneEntity(
    sourceEntityKey: string,
    expiresInSeconds: number
  ): Promise<{ entityKey: string; txHash: string }> {
    if (!this.walletClient || !this.publicClient) {
      // Mock mode
      const mockId = `mock_clone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockTxHash = `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      console.log(`📋 [MOCK] Cloning entity ${sourceEntityKey} -> ${mockId}`);
      return { entityKey: mockId, txHash: mockTxHash };
    }

    try {
      // Fetch original entity
      const sourceEntity = await this.publicClient.getEntity(sourceEntityKey);

      // Create new entity with same data but new expiration
      const { entityKey: newEntityKey, txHash } = await this.walletClient.createEntity({
        payload: sourceEntity.payload,
        contentType: sourceEntity.contentType,
        attributes: sourceEntity.attributes.map((attr: any) => ({
          key: attr.key,
          value: attr.value,
        })),
        expiresIn: expiresInSeconds,
      });

      console.log(`✅ Cloned entity: ${sourceEntityKey} -> ${newEntityKey} - TX: ${txHash}`);
      return { entityKey: newEntityKey, txHash };
    } catch (error) {
      console.error(`Failed to clone entity ${sourceEntityKey}:`, error);
      throw new Error(`Arkiv clone failed: ${error}`);
    }
  }

  /**
   * Check if client is initialized (not in mock mode)
   */
  isInitialized(): boolean {
    return this.walletClient !== null && this.publicClient !== null;
  }
}

// Singleton instance
export const arkivClient = new ArkivClient();
