import { Button } from '@/components/ui/button';
import { Music, Upload } from 'lucide-react';

interface EmptyStateProps {
  onUploadClick?: () => void;
}

export default function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <Music className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-serif font-semibold mb-2" data-testid="text-empty-heading">
        Your library is empty
      </h2>
      <p className="text-muted-foreground mb-6 max-w-md" data-testid="text-empty-description">
        Upload your first track and start building your decentralized music collection
      </p>
      <Button
        size="lg"
        onClick={() => {
          onUploadClick?.();
          console.log('Upload clicked from empty state');
        }}
        data-testid="button-upload-empty"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload First Track
      </Button>
    </div>
  );
}
