import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play } from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import ThemeToggle from '@/components/ThemeToggle';
import BlockchainInfo from '@/components/BlockchainInfo';
import RentalPayment from '@/components/RentalPayment';
import type { CatalogItem, CatalogChunk } from '@shared/schema';

export default function TrackDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: item, isLoading } = useQuery<CatalogItem & { chunkCount: number }>({
    queryKey: ['/api/catalog', id],
    enabled: !!id,
  });

  const { data: chunks } = useQuery<CatalogChunk[]>({
    queryKey: ['/api/catalog', id, 'chunks'],
    enabled: !!id,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Track Not Found</h2>
          <p className="text-muted-foreground mb-6">This track does not exist or has been removed.</p>
          <Link href="/">
            <Button>Back to Browse</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {item.coverUrl ? (
                  <img
                    src={item.coverUrl}
                    alt={`${item.title} cover`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-8">
                    <Play className="w-24 h-24 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">No cover art</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Track Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-mono">{formatDuration(item.durationSeconds)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary">{item.type}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline">{item.category || 'Uncategorized'}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Chunks on Arkiv</span>
                  <span className="font-mono">{item.chunkCount || 0}</span>
                </div>
              </div>
            </Card>

            <BlockchainInfo 
              masterPlaylistTxHash={item.masterPlaylistTxHash}
              chunks={chunks}
            />
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold mb-2" data-testid="text-track-title">
                {item.title}
              </h1>
              <p className="text-xl text-muted-foreground mb-6" data-testid="text-track-artist">
                {item.artist}
              </p>

              {item.description && (
                <p className="text-muted-foreground leading-relaxed mb-8">{item.description}</p>
              )}
            </div>

            <RentalPayment catalogItemId={item.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
