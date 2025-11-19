import TrackCard from '../TrackCard';
import album1 from '@assets/generated_images/Purple_gradient_album_art_65c8937b.png';
import album2 from '@assets/generated_images/Pink_sunset_album_art_f09cef53.png';

export default function TrackCardExample() {
  return (
    <div className="p-6 bg-background">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <TrackCard
          id="1"
          title="Neon Dreams"
          artist="Synthwave Collective"
          albumArt={album1}
          duration="3:45"
          daysRemaining={15}
        />
        <TrackCard
          id="2"
          title="Sunset Boulevard"
          artist="Vaporwave Artists"
          albumArt={album2}
          duration="4:20"
          daysRemaining={1}
        />
      </div>
    </div>
  );
}
