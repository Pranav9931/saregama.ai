import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Upload, Grid3x3, List } from 'lucide-react';
import { Link } from 'wouter';
import WalletButton from '@/components/WalletButton';
import ThemeToggle from '@/components/ThemeToggle';
import TrackCard from '@/components/TrackCard';
import MusicPlayer from '@/components/MusicPlayer';
import UploadModal from '@/components/UploadModal';
import EmptyState from '@/components/EmptyState';
import { useWallet } from '@/contexts/WalletContext';
import type { UserRental, CatalogItem } from '@shared/schema';

interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: string;
  daysRemaining: number;
  isExpired?: boolean;
  durationSeconds: number;
}

interface RentalWithItem extends UserRental {
  catalogItem?: CatalogItem;
}

export default function Library() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { walletAddress, isConnected } = useWallet();

  const { data: rentals, isLoading } = useQuery<RentalWithItem[]>({
    queryKey: ['/api/rentals', walletAddress],
    enabled: !!walletAddress,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDaysRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handlePlayTrack = (trackId: string) => {
    const rental = rentals?.find((r) => r.id === trackId);
    if (rental && rental.catalogItem && rental.isActive) {
      setCurrentTrack({
        id: rental.id,
        title: rental.catalogItem.title,
        artist: rental.catalogItem.artist,
        albumArt: rental.catalogItem.coverUrl || 'https://via.placeholder.com/300',
        duration: formatDuration(rental.catalogItem.durationSeconds),
        durationSeconds: rental.catalogItem.durationSeconds,
        daysRemaining: getDaysRemaining(rental.rentalExpiresAt),
        isExpired: !rental.isActive,
      });
      setIsPlaying(true);
    }
  };

  const activeTracks = rentals?.filter((r) => r.isActive) || [];
  const tracks = rentals || [];

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
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-browse">
                Browse
              </Link>
              <Link href="/library" className="text-sm font-medium text-foreground" data-testid="link-library">
                Library
              </Link>
              <Link href="/uploads" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-uploads">
                Uploads
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-2" data-testid="text-library-heading">
              Your Library
            </h2>
            <p className="text-muted-foreground" data-testid="text-library-count">
              {activeTracks.length} {activeTracks.length === 1 ? 'track' : 'tracks'} on Arkiv
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              data-testid="button-view-grid"
            >
              <Grid3x3 className="w-5 h-5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Please connect your wallet to view your library</p>
            <WalletButton />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-lg mb-4" />
                <div className="h-4 bg-muted rounded mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <EmptyState onUploadClick={() => setUploadModalOpen(true)} />
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                : 'space-y-4'
            }
          >
            {tracks.map((rental) => {
              const item = rental.catalogItem;
              if (!item) return null;
              
              return (
                <TrackCard
                  key={rental.id}
                  id={rental.id}
                  title={item.title}
                  artist={item.artist}
                  albumArt={item.coverUrl || 'https://via.placeholder.com/300'}
                  duration={formatDuration(item.durationSeconds)}
                  daysRemaining={getDaysRemaining(rental.rentalExpiresAt)}
                  isExpired={!rental.isActive || new Date(rental.rentalExpiresAt) < new Date()}
                  onPlay={handlePlayTrack}
                />
              );
            })}
          </div>
        )}
      </main>

      {currentTrack && (
        <MusicPlayer
          track={{
            id: currentTrack.id,
            title: currentTrack.title,
            artist: currentTrack.artist,
            albumArt: currentTrack.albumArt,
            duration: currentTrack.durationSeconds,
          }}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onNext={() => {
            const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
            const nextRental = tracks[currentIndex + 1] || tracks[0];
            if (nextRental?.catalogItem && nextRental.isActive) {
              setCurrentTrack({
                id: nextRental.id,
                title: nextRental.catalogItem.title,
                artist: nextRental.catalogItem.artist,
                albumArt: nextRental.catalogItem.coverUrl || 'https://via.placeholder.com/300',
                duration: formatDuration(nextRental.catalogItem.durationSeconds),
                durationSeconds: nextRental.catalogItem.durationSeconds,
                daysRemaining: getDaysRemaining(nextRental.rentalExpiresAt),
                isExpired: !nextRental.isActive,
              });
            }
          }}
          onPrevious={() => {
            const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
            const prevRental = tracks[currentIndex - 1] || tracks[tracks.length - 1];
            if (prevRental?.catalogItem && prevRental.isActive) {
              setCurrentTrack({
                id: prevRental.id,
                title: prevRental.catalogItem.title,
                artist: prevRental.catalogItem.artist,
                albumArt: prevRental.catalogItem.coverUrl || 'https://via.placeholder.com/300',
                duration: formatDuration(prevRental.catalogItem.durationSeconds),
                durationSeconds: prevRental.catalogItem.durationSeconds,
                daysRemaining: getDaysRemaining(prevRental.rentalExpiresAt),
                isExpired: !prevRental.isActive,
              });
            }
          }}
        />
      )}

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
