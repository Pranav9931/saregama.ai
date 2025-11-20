import { useEffect, useRef, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import Hls from 'hls.js';
import VissonanceVisualizer from '@/components/VissonanceVisualizer';
import ChunkIndicator from '@/components/ChunkIndicator';
import { useWallet } from '@/contexts/WalletContext';
import type { UserRental, CatalogItem } from '@shared/schema';

interface RentalWithItem extends UserRental {
  catalogItem?: CatalogItem;
}

export default function Visualizer() {
  const [, params] = useRoute('/visualizer/:rentalId');
  const rentalId = params?.rentalId;
  
  const { walletAddress } = useWallet();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(-1);
  const [totalChunks, setTotalChunks] = useState(0);

  const { data: rental } = useQuery<RentalWithItem>({
    queryKey: ['/api/rentals', walletAddress, rentalId],
    enabled: !!walletAddress && !!rentalId,
    queryFn: async () => {
      const response = await fetch(`/api/rentals/${walletAddress}`);
      if (!response.ok) throw new Error('Failed to fetch rentals');
      const rentals: RentalWithItem[] = await response.json();
      const found = rentals.find(r => r.id === rentalId);
      if (!found) throw new Error('Rental not found');
      return found;
    },
  });

  useEffect(() => {
    if (!rental || !walletAddress || !audioRef.current) return;

    const audioElement = audioRef.current;
    const playlistUrl = `/api/stream/${rental.id}/playlist?walletAddress=${encodeURIComponent(walletAddress)}`;

    if (rental.catalogItem?.totalChunks) {
      setTotalChunks(rental.catalogItem.totalChunks);
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        audioElement.play()
          .then(() => {
            setIsPlaying(true);
            console.log('Autoplay started');
          })
          .catch((err) => {
            console.log('Autoplay blocked by browser:', err);
          });
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const url = data.frag.url;
        const chunkMatch = url.match(/chunk\/(\d+)/);
        if (chunkMatch) {
          const chunkNum = parseInt(chunkMatch[1], 10);
          setCurrentChunk(chunkNum);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error - attempting to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error - attempting to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error - cannot recover');
              hls.destroy();
              break;
          }
        }
      });

      hls.loadSource(playlistUrl);
      hls.attachMedia(audioElement);
    } else if (audioElement.canPlayType('application/vnd.apple.mpegurl')) {
      audioElement.src = playlistUrl;
      audioElement.addEventListener('loadedmetadata', () => {
        audioElement.play()
          .then(() => {
            setIsPlaying(true);
            console.log('Autoplay started (native HLS)');
          })
          .catch((err) => {
            console.log('Autoplay blocked by browser:', err);
          });
      }, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [rental, walletAddress]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const updateTime = () => setCurrentTime(audioElement.currentTime);
    const updateDuration = () => setDuration(audioElement.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audioElement.addEventListener('timeupdate', updateTime);
    audioElement.addEventListener('loadedmetadata', updateDuration);
    audioElement.addEventListener('durationchange', updateDuration);
    audioElement.addEventListener('ended', handleEnded);

    return () => {
      audioElement.removeEventListener('timeupdate', updateTime);
      audioElement.removeEventListener('loadedmetadata', updateDuration);
      audioElement.removeEventListener('durationchange', updateDuration);
      audioElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = async () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    try {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        await audioElement.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (value: number[]) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    audioElement.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    audioElement.volume = newVolume / 100;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioElement.muted = newMuted;
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!rental || !rental.catalogItem) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Loading...</p>
        </div>
      </div>
    );
  }

  const track = rental.catalogItem;

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <VissonanceVisualizer audioElement={audioElement} isPlaying={isPlaying} />
      
      <audio 
        ref={(node) => {
          audioRef.current = node;
          setAudioElement(node);
        }} 
        className="hidden" 
      />

      <div className="fixed top-4 right-4 z-50">
        <Link href="/library">
          <Button variant="ghost" size="icon" className="bg-background/20 backdrop-blur-sm hover:bg-background/40" data-testid="button-close">
            <X className="w-5 h-5" />
          </Button>
        </Link>
      </div>

      {totalChunks > 0 && (
        <ChunkIndicator totalChunks={totalChunks} currentChunk={currentChunk} />
      )}

      <div className="fixed bottom-16 left-0 right-0 z-50 p-8">
        <div className="flex items-center justify-center gap-6">
          <Button
            size="icon"
            variant="ghost"
            onClick={handlePlayPause}
            className="w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            data-testid="button-play-pause"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 ml-0.5 text-white" />
            )}
          </Button>
          <div className="text-center">
            <h2 className="text-lg font-medium text-white mb-0.5" data-testid="text-track-title">{track.title}</h2>
            <p className="text-sm text-white/70" data-testid="text-track-artist">{track.artist}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
