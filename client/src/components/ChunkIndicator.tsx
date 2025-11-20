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

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
      <div className="max-w-4xl mx-auto px-8 pb-6">
        <div className="bg-black/40 backdrop-blur-md rounded-lg p-3 border border-white/10">
          <div className="flex gap-1" data-testid="chunk-progress-bar">
            {Array.from({ length: totalChunks }).map((_, index) => {
              const isLoaded = index <= currentChunk;
              const isCurrentlyLoading = index === currentChunk && chunks.some(c => c.id === currentChunk && c.status === 'loading');
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative group flex-1"
                  data-testid={`chunk-block-${index}`}
                >
                  <div 
                    className={`h-5 rounded-sm border transition-all duration-300 ${
                      isCurrentlyLoading
                        ? 'bg-primary border-primary shadow-lg shadow-primary/50 animate-pulse'
                        : isLoaded
                        ? 'bg-primary/80 border-primary/60'
                        : 'bg-white/5 border-white/20'
                    }`}
                  />
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                    <span className="text-[10px] text-white/80 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded">
                      #{index}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <div className="mt-2 text-[10px] text-white/40 text-center">
            {currentChunk < 0 ? (
              'Initializing decentralized stream...'
            ) : (
              `${currentChunk + 1} / ${totalChunks} chunks loaded from blockchain`
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
