import { useState, useRef, useEffect } from 'react';
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

interface MusicPlayerProps {
  track?: {
    id: string;
    title: string;
    artist: string;
    albumArt: string;
    duration: number;
  };
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export default function MusicPlayer({
  track,
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrevious,
}: MusicPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (track && prev >= track.duration) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, track]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    setCurrentTime(value[0]);
    console.log(`Seeked to: ${formatTime(value[0])}`);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    console.log(isMuted ? 'Unmuted' : 'Muted');
  };

  if (!track) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 md:h-28 bg-card border-t border-card-border z-50">
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
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                onPrevious?.();
                console.log('Previous track');
              }}
              data-testid="button-previous"
            >
              <SkipBack className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              className="w-10 h-10 md:w-12 md:h-12"
              onClick={() => {
                onPlayPause?.();
                console.log(isPlaying ? 'Paused' : 'Playing');
              }}
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
                console.log('Next track');
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
              max={track.duration}
              step={1}
              onValueChange={handleSeek}
              className="flex-1"
              data-testid="slider-progress"
            />
            <span className="text-xs text-muted-foreground w-10" data-testid="text-total-time">
              {formatTime(track.duration)}
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
