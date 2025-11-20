import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useChunkFetch } from '@/contexts/ChunkFetchContext';

interface MusicPlayerProps {
  track?: {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    duration: number;
    type: 'audio' | 'video';
  };
  playlistUrl?: string;
  walletAddress?: string;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function MusicPlayer({
  track,
  playlistUrl,
  walletAddress,
  onNext,
  onPrevious,
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { addChunkFetch, clearChunkFetches } = useChunkFetch();

  // Get the appropriate media element ref based on track type
  const mediaRef = track?.type === 'video' ? videoRef : audioRef;

  // Initialize HLS player
  useEffect(() => {
    if (!playlistUrl || !walletAddress || !track) {
      return;
    }

    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setIsLoading(true);
    setError(null);

    // Construct the full playlist URL with wallet address
    const fullPlaylistUrl = `${playlistUrl}?walletAddress=${encodeURIComponent(walletAddress)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: true,
        enableWorker: true,
        lowLatencyMode: false,
      });

      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed successfully');
        setIsLoading(false);
        clearChunkFetches();
      });

      // Track chunk fetches from blockchain
      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        const loader = data.frag.loader as any;
        const response = loader?.context?.xhr;
        if (response) {
          const sequence = response.getResponseHeader('X-Chunk-Sequence');
          const metadataEntityId = response.getResponseHeader('X-Chunk-Metadata-Entity');
          const arkivEntityId = response.getResponseHeader('X-Chunk-Data-Entity');
          const txHash = response.getResponseHeader('X-Chunk-TxHash');

          if (sequence && metadataEntityId && arkivEntityId && txHash) {
            addChunkFetch({
              sequence: parseInt(sequence),
              metadataEntityId,
              arkivEntityId,
              txHash,
            });
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          setError('Failed to load stream');
          setIsLoading(false);
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

      hls.loadSource(fullPlaylistUrl);
      hls.attachMedia(mediaElement);
    } else if (mediaElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      mediaElement.src = fullPlaylistUrl;
      mediaElement.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
      });
    } else {
      setError('HLS is not supported in this browser');
      setIsLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [playlistUrl, walletAddress, track?.id, track?.type]);

  // Update current time and duration
  useEffect(() => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    const updateTime = () => setCurrentTime(mediaElement.currentTime);
    const updateDuration = () => setDuration(mediaElement.duration || track?.duration || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    mediaElement.addEventListener('timeupdate', updateTime);
    mediaElement.addEventListener('loadedmetadata', updateDuration);
    mediaElement.addEventListener('durationchange', updateDuration);
    mediaElement.addEventListener('ended', handleEnded);

    return () => {
      mediaElement.removeEventListener('timeupdate', updateTime);
      mediaElement.removeEventListener('loadedmetadata', updateDuration);
      mediaElement.removeEventListener('durationchange', updateDuration);
      mediaElement.removeEventListener('ended', handleEnded);
    };
  }, [track, mediaRef]);

  const handlePlayPause = async () => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;

    try {
      if (isPlaying) {
        mediaElement.pause();
        setIsPlaying(false);
      } else {
        await mediaElement.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setError('Failed to play media');
    }
  };

  const handleSeek = (value: number[]) => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    mediaElement.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    const newVolume = value[0];
    setVolume(newVolume);
    mediaElement.volume = newVolume / 100;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const mediaElement = mediaRef.current;
    if (!mediaElement) return;
    
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    mediaElement.muted = newMuted;
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 md:h-28 bg-card border-t border-card-border z-50">
      {/* Hidden media elements for HLS playback */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
      />
      <audio
        ref={audioRef}
        className="hidden"
      />

      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0 w-48 md:w-64">
          <img
            src={track.albumArt}
            alt={`${track.title} album art`}
            className="w-14 h-14 md:w-16 md:h-16 rounded-md object-cover flex-shrink-0"
            data-testid="img-player-albumart"
          />
          <div className="min-w-0">
            <h4 className="font-semibold text-sm md:text-base truncate" data-testid="text-player-title">
              {track.title}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground truncate" data-testid="text-player-artist">
              {track.artist}
            </p>
            {isLoading && (
              <p className="text-xs text-muted-foreground" data-testid="text-loading">
                Loading...
              </p>
            )}
            {error && (
              <p className="text-xs text-destructive" data-testid="text-error">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onPrevious?.();
              }}
              data-testid="button-previous"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12"
              onClick={handlePlayPause}
              disabled={isLoading || !!error}
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onNext?.();
              }}
              data-testid="button-next"
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-10 text-right" data-testid="text-current-time">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[currentTime]}
              max={duration || track.duration}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              disabled={isLoading || !!error}
              data-testid="slider-progress"
            />
            <span className="text-xs text-muted-foreground w-10" data-testid="text-total-time">
              {formatTime(duration || track.duration)}
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 relative">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            onMouseEnter={() => setShowVolumeSlider(true)}
            data-testid="button-volume"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
          {showVolumeSlider && (
            <div
              className="absolute bottom-full right-0 mb-2 p-3 bg-popover border border-popover-border rounded-md"
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <Slider
                value={[isMuted ? 0 : volume]}
                max={100}
                step={1}
                onValueChange={handleVolumeChange}
                orientation="vertical"
                className="h-24"
                data-testid="slider-volume"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
