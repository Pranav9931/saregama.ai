import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChunkFetch {
  id: string;
  sequence: number;
  metadataEntityId: string;
  arkivEntityId: string;
  txHash: string;
  timestamp: number;
}

interface BlockchainChunkVisualizerProps {
  chunkFetches: ChunkFetch[];
  explorerBaseUrl?: string;
}

export default function BlockchainChunkVisualizer({
  chunkFetches,
  explorerBaseUrl = 'https://explorer.mendoza.hoodi.arkiv.network',
}: BlockchainChunkVisualizerProps) {
  const [displayedFetches, setDisplayedFetches] = useState<ChunkFetch[]>([]);

  useEffect(() => {
    if (chunkFetches.length > displayedFetches.length) {
      const newFetches = chunkFetches.slice(displayedFetches.length);
      newFetches.forEach((fetch, index) => {
        setTimeout(() => {
          setDisplayedFetches(prev => [...prev, fetch]);
        }, index * 300);
      });
    } else if (chunkFetches.length < displayedFetches.length) {
      setDisplayedFetches(chunkFetches);
    }
  }, [chunkFetches, displayedFetches.length]);

  if (chunkFetches.length === 0) {
    return null;
  }

  return (
    <Card className="w-full" data-testid="card-blockchain-visualizer">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4" />
          Blockchain Chunk Fetches
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 pr-4">
          <div className="space-y-3">
            {displayedFetches.map((fetch, index) => (
              <div
                key={fetch.id}
                className="p-3 rounded-md bg-muted/50 border border-border animate-in fade-in slide-in-from-bottom-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
                data-testid={`chunk-fetch-${fetch.sequence}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" data-testid={`badge-chunk-${fetch.sequence}`}>
                      Chunk {fetch.sequence}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(fetch.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-20">Metadata:</span>
                    <code className="flex-1 bg-background px-2 py-1 rounded text-xs break-all font-mono" data-testid={`text-metadata-${fetch.sequence}`}>
                      {fetch.metadataEntityId}
                    </code>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground min-w-20">Data Entity:</span>
                    <code className="flex-1 bg-background px-2 py-1 rounded text-xs break-all font-mono" data-testid={`text-data-${fetch.sequence}`}>
                      {fetch.arkivEntityId}
                    </code>
                  </div>
                  
                  <a
                    href={`${explorerBaseUrl}/tx/${fetch.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline mt-2"
                    data-testid={`link-explorer-${fetch.sequence}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on Block Explorer
                  </a>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
