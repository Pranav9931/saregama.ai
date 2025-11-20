import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import ThemeToggle from '@/components/ThemeToggle';
import TrackCard from '@/components/TrackCard';
import UploadModal from '@/components/UploadModal';
import EmptyState from '@/components/EmptyState';
import type { CatalogItem } from '@shared/schema';
import { Link } from 'wouter';

export default function Browse() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const { data: catalogItems, isLoading } = useQuery<CatalogItem[]>({
    queryKey: ['/api/catalog'],
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <h1 className="text-xl font-serif font-bold hidden sm:block" data-testid="text-logo">
                Arkiv Music
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/">
                <a className="text-sm font-medium text-foreground" data-testid="link-browse">
                  Browse
                </a>
              </Link>
              <Link href="/library">
                <a className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-library">
                  Your Library
                </a>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setUploadModalOpen(true)}
              data-testid="button-upload-header"
            >
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Upload</span>
            </Button>
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2" data-testid="text-browse-heading">
            Discover Music
          </h2>
          <p className="text-muted-foreground" data-testid="text-browse-subtitle">
            {catalogItems?.length || 0} tracks available on Arkiv blockchain
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : !catalogItems || catalogItems.length === 0 ? (
          <EmptyState onUploadClick={() => setUploadModalOpen(true)} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {catalogItems.map((item) => (
              <Link key={item.id} href={`/track/${item.id}`}>
                <a>
                  <TrackCard
                    id={item.id}
                    title={item.title}
                    artist={item.artist}
                    albumArt={item.coverUrl || 'https://via.placeholder.com/300'}
                    duration={formatDuration(item.durationSeconds)}
                    daysRemaining={365}
                    isExpired={false}
                  />
                </a>
              </Link>
            ))}
          </div>
        )}
      </main>

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={() => {
          setUploadModalOpen(false);
        }}
      />
    </div>
  );
}
