import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Music, CheckCircle2, FileAudio, Package, Cloud, Hash } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (track: any) => void;
}

interface UploadJob {
  id: string;
  status: 'processing' | 'chunking' | 'uploading' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  catalogItemId?: string;
}

interface ChunkInfo {
  sequence: number;
  arkivEntityId: string;
  sizeBytes: number;
}

export default function UploadModal({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadModalProps) {
  const { walletAddress } = useWallet();
  const { toast } = useToast();
  
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState('new-releases');
  const [jobId, setJobId] = useState<string | null>(null);
  const [masterPlaylistId, setMasterPlaylistId] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      console.log('File dropped:', file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      console.log('File selected:', file.name);
    }
  };

  const pollJobStatus = async (id: string) => {
    let pollAttempts = 0;
    const maxAttempts = 300; // 5 minutes max
    
    const poll = async () => {
      // Clear any existing timeout
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      
      if (pollAttempts >= maxAttempts) {
        setIsUploading(false);
        toast({
          title: 'Upload Timeout',
          description: 'Upload is taking longer than expected. Check Uploads page for status.',
          variant: 'destructive',
        });
        return;
      }
      
      pollAttempts++;
      
      try {
        const response = await fetch(`/api/uploads/${id}`);
        if (!response.ok) {
          // Retry on network errors
          pollingTimeoutRef.current = setTimeout(() => poll(), 2000);
          return;
        }
        
        const job: UploadJob = await response.json();
        
        setUploadProgress(job.progress);
        setUploadStatus(job.status);
        
        if (job.status === 'completed') {
          setIsComplete(true);
          setIsUploading(false);
          
          // Fetch transaction details
          if (job.catalogItemId) {
            try {
              const [catalogResponse, chunksResponse] = await Promise.all([
                fetch(`/api/catalog/${job.catalogItemId}`),
                fetch(`/api/catalog/${job.catalogItemId}/chunks`)
              ]);
              
              if (catalogResponse.ok && chunksResponse.ok) {
                const catalogItem = await catalogResponse.json();
                const chunksData = await chunksResponse.json();
                
                setMasterPlaylistId(catalogItem.masterPlaylistId);
                setChunks(chunksData.map((c: any) => ({
                  sequence: c.sequence,
                  arkivEntityId: c.arkivEntityId,
                  sizeBytes: c.sizeBytes,
                })));
              }
            } catch (error) {
              console.error('Failed to fetch transaction details:', error);
            }
          }
          
          // Invalidate queries with correct keys
          queryClient.invalidateQueries({ queryKey: ['/api/catalog'] });
          if (walletAddress) {
            queryClient.invalidateQueries({ queryKey: [`/api/uploads/wallet/${walletAddress}`] });
          }
          
          toast({
            title: 'Upload Complete!',
            description: 'Your track is now available on the Arkiv blockchain',
          });
          
          setTimeout(() => {
            onUploadComplete?.({ catalogItemId: job.catalogItemId });
            onOpenChange(false);
            resetForm();
          }, 3000);
        } else if (job.status === 'failed') {
          setIsUploading(false);
          toast({
            title: 'Upload Failed',
            description: job.errorMessage || 'An error occurred during upload',
            variant: 'destructive',
          });
        } else {
          // Continue polling for in-progress jobs
          pollingTimeoutRef.current = setTimeout(() => poll(), 1000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Retry on error
        pollingTimeoutRef.current = setTimeout(() => poll(), 2000);
      }
    };
    
    poll();
  };

  const handleUpload = async () => {
    if (!selectedFile || !title || !artist || !walletAddress) {
      toast({
        title: 'Missing Information',
        description: 'Please connect your wallet and fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('processing');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('walletAddress', walletAddress);
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('category', category);
    formData.append('type', selectedFile.type.startsWith('video/') ? 'video' : 'audio');

    try {
      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setJobId(data.jobId);
      
      // Start polling job status
      pollJobStatus(data.jobId);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      toast({
        title: 'Upload Failed',
        description: 'Failed to start upload process',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    // Clear polling timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    
    setSelectedFile(null);
    setTitle('');
    setArtist('');
    setCategory('new-releases');
    setUploadProgress(0);
    setUploadStatus('');
    setIsComplete(false);
    setJobId(null);
    setMasterPlaylistId(null);
    setChunks([]);
    setCurrentChunk(0);
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'processing':
        return 'Receiving file...';
      case 'chunking':
        return 'Converting to HLS chunks...';
      case 'uploading':
        return 'Uploading to Arkiv blockchain...';
      case 'completed':
        return 'Upload complete!';
      case 'failed':
        return 'Upload failed';
      default:
        return 'Starting upload...';
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'processing':
        return <FileAudio className="w-5 h-5 text-primary animate-pulse" />;
      case 'chunking':
        return <Package className="w-5 h-5 text-primary animate-pulse" />;
      case 'uploading':
        return <Cloud className="w-5 h-5 text-primary animate-pulse" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      default:
        return <Upload className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" data-testid="dialog-upload">
        <DialogHeader>
          <DialogTitle>Upload to Arkiv</DialogTitle>
          <DialogDescription>
            Upload your media file to the Arkiv blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!selectedFile ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              data-testid="dropzone-upload"
            >
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">Drop audio/video file here</p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <Button variant="outline" asChild data-testid="button-browse">
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </Button>
            </div>
          ) : (
            <>
              {!isComplete ? (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <Music className="w-8 h-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {!isUploading && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFile(null)}
                          data-testid="button-remove-file"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">Track Title</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter track title"
                        disabled={isUploading}
                        data-testid="input-title"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="artist">Artist Name</Label>
                      <Input
                        id="artist"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="Enter artist name"
                        disabled={isUploading}
                        data-testid="input-artist"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={category}
                        onValueChange={setCategory}
                        disabled={isUploading}
                      >
                        <SelectTrigger id="category" data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="featured">Featured</SelectItem>
                          <SelectItem value="trending">Trending</SelectItem>
                          <SelectItem value="new-releases">New Releases</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getStatusIcon()}
                            <span className="text-muted-foreground">
                              {getStatusText()}
                            </span>
                          </div>
                          <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <Progress value={uploadProgress} />
                      </div>

                      {jobId && (
                        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Hash className="w-3 h-3" />
                            <span className="text-muted-foreground">Job ID:</span>
                            <span className="font-mono text-foreground">{jobId}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <span className={uploadProgress >= 10 ? 'text-green-500' : ''}>✓</span>
                          File received
                        </p>
                        <p className="flex items-center gap-2">
                          <span className={uploadProgress >= 40 ? 'text-green-500' : ''}>✓</span>
                          HLS chunks created
                        </p>
                        <p className="flex items-center gap-2">
                          <span className={uploadProgress >= 100 ? 'text-green-500' : ''}>✓</span>
                          Uploaded to Arkiv network
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      disabled={isUploading}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={!title || !artist || isUploading || !walletAddress}
                      data-testid="button-upload"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload to Arkiv
                    </Button>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-xl font-semibold mb-2">Upload Complete!</h3>
                  <p className="text-muted-foreground mb-4">
                    Your track has been stored on the Arkiv blockchain
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Refreshing catalog...
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
