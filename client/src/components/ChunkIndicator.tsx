import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChunkInfo {
  id: number;
  timestamp: number;
  status: 'loading' | 'loaded';
}

interface ChunkIndicatorProps {
  totalChunks: number;
  currentChunk: number;
}

export default function ChunkIndicator({ totalChunks, currentChunk }: ChunkIndicatorProps) {
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);

  useEffect(() => {
    if (currentChunk >= 0 && totalChunks > 0) {
      setChunks(prev => {
        const existing = prev.find(c => c.id === currentChunk);
        if (existing) {
          return prev.map(c => 
            c.id === currentChunk 
              ? { ...c, status: 'loaded' as const, timestamp: Date.now() }
              : c
          );
        }
        return [...prev, { id: currentChunk, timestamp: Date.now(), status: 'loading' as const }];
      });

      const timer = setTimeout(() => {
        setChunks(prev => 
          prev.map(c => 
            c.id === currentChunk ? { ...c, status: 'loaded' as const } : c
          )
        );
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [currentChunk]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setChunks(prev => prev.filter(c => now - c.timestamp < 10000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  const visibleChunks = chunks.slice(-8);

  return (
    <div className="fixed bottom-20 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-4xl mx-auto px-8">
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white/90">
                Streaming from Arkiv Blockchain
              </span>
            </div>
            <span className="text-xs text-white/60" data-testid="text-chunk-progress">
              {currentChunk < 0 ? (
                'Initializing...'
              ) : (
                `Chunk ${currentChunk + 1} / ${totalChunks}`
              )}
            </span>
          </div>
          
          <div className="flex gap-1.5 h-8 items-end">
            <AnimatePresence mode="popLayout">
              {visibleChunks.map((chunk) => (
                <motion.div
                  key={chunk.id}
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ 
                    opacity: chunk.status === 'loaded' ? 0.6 : 1,
                    scale: 1,
                    y: 0
                  }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 relative group"
                  data-testid={`chunk-indicator-${chunk.id}`}
                >
                  <div 
                    className={`h-full rounded-sm transition-all duration-300 ${
                      chunk.status === 'loading' 
                        ? 'bg-primary shadow-lg shadow-primary/50' 
                        : 'bg-primary/40'
                    }`}
                    style={{
                      height: chunk.status === 'loading' ? '100%' : '60%'
                    }}
                  />
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white/80 whitespace-nowrap">
                      #{chunk.id}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <div className="mt-2 text-[10px] text-white/40 text-center">
            Fetching encrypted audio chunks from decentralized storage
          </div>
        </div>
      </div>
    </div>
  );
}
