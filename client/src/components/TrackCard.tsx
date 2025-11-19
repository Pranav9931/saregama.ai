import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import RentalBadge from './RentalBadge';
import { useState } from 'react';

interface TrackCardProps {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: string;
  daysRemaining: number;
  isExpired?: boolean;
  onPlay?: (id: string) => void;
}

export default function TrackCard({
  id,
  title,
  artist,
  albumArt,
  duration,
  daysRemaining,
  isExpired = false,
  onPlay,
}: TrackCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    onPlay?.(id);
    console.log(`${isPlaying ? 'Paused' : 'Playing'} track: ${title}`);
  };

  return (
    <Card
      className="group overflow-hidden hover-elevate transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-track-${id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={albumArt}
          alt={`${title} album art`}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        {isExpired && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-lg font-semibold text-muted-foreground">Expired</span>
          </div>
        )}
        {!isExpired && isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm transition-opacity">
            <Button
              size="icon"
              variant="default"
              className="w-14 h-14 rounded-full"
              onClick={handlePlayPause}
              data-testid={`button-play-${id}`}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6" fill="currentColor" />
              )}
            </Button>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div>
          <h3 className="font-serif font-semibold text-lg line-clamp-1" data-testid={`text-title-${id}`}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-artist-${id}`}>
            {artist}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground" data-testid={`text-duration-${id}`}>
            {duration}
          </span>
          <RentalBadge daysRemaining={daysRemaining} isExpired={isExpired} />
        </div>
      </div>
    </Card>
  );
}
