import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { CatalogChunk } from '@shared/schema';

const MENDOZA_EXPLORER_URL = 'https://explorer.mendoza.hoodi.arkiv.network';

interface BlockchainInfoProps {
  masterPlaylistTxHash?: string | null;
  chunks?: CatalogChunk[];
}

export default function BlockchainInfo({ masterPlaylistTxHash, chunks }: BlockchainInfoProps) {
  const [showChunks, setShowChunks] = useState(false);

  const formatTxHash = (hash: string) => {
    if (hash.length < 20) return hash;
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  const getTxLink = (txHash: string) => {
    return `${MENDOZA_EXPLORER_URL}/tx/${txHash}`;
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Blockchain Storage (Arkiv Network)</h3>
      
      <div className="space-y-4 text-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-muted-foreground block mb-1">Network</span>
            <Badge variant="secondary">Mendoza Testnet (L3)</Badge>
          </div>
        </div>

        {masterPlaylistTxHash && (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-muted-foreground block mb-1">Master Playlist Transaction</span>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded" data-testid="text-playlist-tx-hash">
                  {formatTxHash(masterPlaylistTxHash)}
                </code>
                <a
                  href={getTxLink(masterPlaylistTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-playlist-tx"
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="button-playlist-tx-explorer">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        {chunks && chunks.length > 0 && (
          <div>
            <button
              onClick={() => setShowChunks(!showChunks)}
              className="flex items-center justify-between w-full text-left hover-elevate active-elevate-2 p-2 rounded-md -ml-2"
              data-testid="button-toggle-chunks"
            >
              <span className="text-muted-foreground">
                Video Chunks ({chunks.length} on-chain)
              </span>
              {showChunks ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showChunks && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto" data-testid="chunks-list">
                {chunks.map((chunk, index) => (
                  <div
                    key={chunk.id}
                    className="flex items-center justify-between gap-2 p-2 bg-muted/50 rounded-md"
                    data-testid={`chunk-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground mb-1" data-testid={`text-chunk-${index}-label`}>
                        Chunk #{chunk.sequence}
                      </div>
                      {chunk.arkivTxHash ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-background px-2 py-1 rounded" data-testid={`text-chunk-${index}-tx-hash`}>
                            {formatTxHash(chunk.arkivTxHash)}
                          </code>
                          <a
                            href={getTxLink(chunk.arkivTxHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-chunk-tx-${index}`}
                          >
                            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-chunk-${index}-tx-explorer`}>
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground" data-testid={`text-chunk-${index}-no-tx`}>No TX hash</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-chunk-${index}-size`}>
                      {(chunk.sizeBytes / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            All media chunks are stored on the Arkiv blockchain network with cryptographic verification.
            Click transaction hashes to view on-chain data.
          </p>
        </div>
      </div>
    </Card>
  );
}
