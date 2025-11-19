import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Grid3x3, List } from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import ThemeToggle from '@/components/ThemeToggle';
import TrackCard from '@/components/TrackCard';
import MusicPlayer from '@/components/MusicPlayer';
import UploadModal from '@/components/UploadModal';
import EmptyState from '@/components/EmptyState';

import album1 from '@assets/generated_images/Purple_gradient_album_art_65c8937b.png';
import album2 from '@assets/generated_images/Pink_sunset_album_art_f09cef53.png';
import album3 from '@assets/generated_images/Teal_geometric_album_art_9731e8ee.png';
import album4 from '@assets/generated_images/Cosmic_nebula_album_art_6d7ad554.png';
import album5 from '@assets/generated_images/Golden_waves_album_art_4a8d1f61.png';

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

export default function Library() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [tracks, setTracks] = useState<Track[]>([
    {
      id: '1',
      title: 'Neon Dreams',
      artist: 'Synthwave Collective',
      albumArt: album1,
      duration: '3:45',
      durationSeconds: 225,
      daysRemaining: 30,
    },
    {
      id: '2',
      title: 'Sunset Boulevard',
      artist: 'Vaporwave Artists',
      albumArt: album2,
      duration: '4:20',
      durationSeconds: 260,
      daysRemaining: 15,
    },
    {
      id: '3',
      title: 'Digital Waves',
      artist: 'Cyber Sound',
      albumArt: album3,
      duration: '5:12',
      durationSeconds: 312,
      daysRemaining: 7,
    },
    {
      id: '4',
      title: 'Cosmic Journey',
      artist: 'Space Explorers',
      albumArt: album4,
      duration: '6:30',
      durationSeconds: 390,
      daysRemaining: 1,
    },
    {
      id: '5',
      title: 'Golden Hour',
      artist: 'Ambient Collective',
      albumArt: album5,
      duration: '4:55',
      durationSeconds: 295,
      daysRemaining: 0,
      isExpired: true,
    },
  ]);

  const handlePlayTrack = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (track && !track.isExpired) {
      setCurrentTrack({
        ...track,
        duration: track.duration,
      });
      setIsPlaying(true);
    }
  };

  const handleUploadComplete = (newTrack: any) => {
    const newId = (tracks.length + 1).toString();
    setTracks([
      {
        id: newId,
        title: newTrack.title,
        artist: newTrack.artist,
        albumArt: album1,
        duration: '3:30',
        durationSeconds: 210,
        daysRemaining: newTrack.rentalDuration,
      },
      ...tracks,
    ]);
    console.log('New track added:', newTrack);
  };

  const activeTracks = tracks.filter((t) => !t.isExpired);

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">A</span>
              </div>
              <h1 className="text-xl font-serif font-bold hidden sm:block" data-testid="text-logo">
                Arkiv Music
              </h1>
            </div>
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

        {tracks.length === 0 ? (
          <EmptyState onUploadClick={() => setUploadModalOpen(true)} />
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6'
                : 'space-y-4'
            }
          >
            {tracks.map((track) => (
              <TrackCard
                key={track.id}
                {...track}
                onPlay={handlePlayTrack}
              />
            ))}
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
            const nextTrack = tracks[currentIndex + 1] || tracks[0];
            if (!nextTrack.isExpired) {
              setCurrentTrack(nextTrack);
            }
          }}
          onPrevious={() => {
            const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
            const prevTrack = tracks[currentIndex - 1] || tracks[tracks.length - 1];
            if (!prevTrack.isExpired) {
              setCurrentTrack(prevTrack);
            }
          }}
        />
      )}

      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUploadComplete={handleUploadComplete}
      />
    </div>
  );
}
