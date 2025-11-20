import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Upload, Hash, Package, Clock, FileAudio, CheckCircle2, XCircle } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import WalletButton from '@/components/WalletButton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface UploadJob {
  id: string;
  walletAddress: string;
  fileName: string;
  fileSize: number;
  status: 'processing' | 'chunking' | 'uploading' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
  catalogItemId?: string;
  createdAt: Date;
  completedAt?: Date;
}

interface CatalogItem {
  id: string;
  title: string;
  artist: string;
  masterPlaylistId: string;
  type: string;
  durationSeconds: number;
}

interface CatalogChunk {
  id: string;
  catalogItemId: string;
  sequence: number;
  arkivEntityId: string;
  nextChunkId: string | null;
  sizeBytes: number;
  createdAt: Date;
}

export default function Uploads() {
  const { walletAddress } = useWallet();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const { data: uploadJobs, isLoading: jobsLoading } = useQuery<UploadJob[]>({
    queryKey: [`/api/uploads/wallet/${walletAddress}`],
    enabled: !!walletAddress,
  });

  const selectedJob = selectedJobId ? uploadJobs?.find(j => j.id === selectedJobId) : null;
  const catalogItemId = selectedJob?.catalogItemId;

  const { data: selectedCatalogItem } = useQuery<CatalogItem>({
    queryKey: [`/api/catalog/${catalogItemId}`],
    enabled: !!catalogItemId,
  });

  const { data: chunks } = useQuery<CatalogChunk[]>({
    queryKey: [`/api/catalog/${catalogItemId}/chunks`],
    enabled: !!catalogItemId,
  });

  const getStatusColor = (status: UploadJob['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'failed':
        return 'bg-destructive/10 text-destructive';
      case 'uploading':
      case 'chunking':
      case 'processing':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: UploadJob['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4 animate-pulse" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold" data-testid="text-logo">
                S
              </div>
              <h1 className="text-xl font-serif font-bold hidden sm:block" data-testid="text-logo">
                Saregama.ai
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-browse">
                Browse
              </Link>
              <Link href="/library" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-library">
                Library
              </Link>
              <Link href="/uploads" className="text-sm font-medium text-foreground" data-testid="link-uploads">
                Uploads
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <WalletButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">Upload History</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            View your uploads and blockchain transaction details
          </p>
        </div>

        {!walletAddress ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-6">
                Connect your wallet to view your upload history
              </p>
              <WalletButton />
            </CardContent>
          </Card>
        ) : jobsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !uploadJobs || uploadJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Uploads Yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first track to get started
              </p>
              <Link href="/">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Go to Browse
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {uploadJobs.map((job) => {
              const catalogItem = job.catalogItemId ? uploadJobs.find(j => j.catalogItemId === job.catalogItemId) : null;
              
              return (
                <Card key={job.id} className="hover-elevate active-elevate-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileAudio className="w-5 h-5" />
                          {job.fileName}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {formatFileSize(job.fileSize)} • {formatDate(job.createdAt)}
                        </CardDescription>
                      </div>
                      <Badge className={`${getStatusColor(job.status)} flex items-center gap-1`}>
                        {getStatusIcon(job.status)}
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Job ID:</span>
                        <code className="font-mono text-xs bg-muted px-2 py-1 rounded">{job.id}</code>
                      </div>

                      {job.status === 'completed' && job.catalogItemId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedJobId(job.id)}
                          data-testid={`button-view-details-${job.id}`}
                        >
                          <Package className="w-4 h-4 mr-2" />
                          View Transaction Details
                        </Button>
                      )}

                      {job.status === 'failed' && job.errorMessage && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                          {job.errorMessage}
                        </div>
                      )}

                      {(job.status === 'processing' || job.status === 'chunking' || job.status === 'uploading') && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{job.status}...</span>
                            <span className="font-medium">{job.progress}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && setSelectedJobId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Blockchain transaction information for this upload
            </DialogDescription>
          </DialogHeader>

          {selectedCatalogItem && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Track Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Title:</div>
                  <div className="font-medium">{selectedCatalogItem.title}</div>
                  <div className="text-muted-foreground">Artist:</div>
                  <div className="font-medium">{selectedCatalogItem.artist}</div>
                  <div className="text-muted-foreground">Duration:</div>
                  <div className="font-medium">{Math.floor(selectedCatalogItem.durationSeconds / 60)}:{(selectedCatalogItem.durationSeconds % 60).toString().padStart(2, '0')}</div>
                  <div className="text-muted-foreground">Type:</div>
                  <div className="font-medium capitalize">{selectedCatalogItem.type}</div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Master Playlist</h3>
                <div className="p-3 bg-muted rounded-lg break-all">
                  <div className="flex items-start gap-2">
                    <Hash className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                    <code className="font-mono text-xs">{selectedCatalogItem.masterPlaylistId}</code>
                  </div>
                </div>
              </div>

              {chunks && chunks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold">HLS Chunks ({chunks.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {chunks.map((chunk) => (
                      <div key={chunk.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            Chunk #{chunk.sequence}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(chunk.sizeBytes / 1024).toFixed(2)} KB
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Hash className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                          <code className="font-mono text-xs break-all text-foreground">
                            {chunk.arkivEntityId}
                          </code>
                        </div>
                        {chunk.nextChunkId && (
                          <div className="mt-2 pl-5 text-xs text-muted-foreground">
                            → Next: {chunk.nextChunkId.substring(0, 20)}...
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
