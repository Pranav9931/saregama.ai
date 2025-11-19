import { useState } from 'react';
import MusicPlayer from '../MusicPlayer';
import album1 from '@assets/generated_images/Purple_gradient_album_art_65c8937b.png';

export default function MusicPlayerExample() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="h-96 bg-background relative">
      <MusicPlayer
        track={{
          id: '1',
          title: 'Neon Dreams',
          artist: 'Synthwave Collective',
          albumArt: album1,
          duration: 225,
        }}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
      />
    </div>
  );
}
