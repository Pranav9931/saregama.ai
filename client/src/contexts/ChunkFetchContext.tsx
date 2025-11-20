import { createContext, useContext, useState, ReactNode } from 'react';

interface ChunkFetch {
  id: string;
  sequence: number;
  metadataEntityId: string;
  arkivEntityId: string;
  txHash: string;
  timestamp: number;
}

interface ChunkFetchContextType {
  chunkFetches: ChunkFetch[];
  addChunkFetch: (fetch: Omit<ChunkFetch, 'id' | 'timestamp'>) => void;
  clearChunkFetches: () => void;
}

const ChunkFetchContext = createContext<ChunkFetchContextType | undefined>(undefined);

export function ChunkFetchProvider({ children }: { children: ReactNode }) {
  const [chunkFetches, setChunkFetches] = useState<ChunkFetch[]>([]);

  const addChunkFetch = (fetch: Omit<ChunkFetch, 'id' | 'timestamp'>) => {
    const newFetch: ChunkFetch = {
      ...fetch,
      id: `${fetch.sequence}-${Date.now()}`,
      timestamp: Date.now(),
    };
    setChunkFetches(prev => [...prev, newFetch]);
  };

  const clearChunkFetches = () => {
    setChunkFetches([]);
  };

  return (
    <ChunkFetchContext.Provider value={{ chunkFetches, addChunkFetch, clearChunkFetches }}>
      {children}
    </ChunkFetchContext.Provider>
  );
}

export function useChunkFetch() {
  const context = useContext(ChunkFetchContext);
  if (!context) {
    throw new Error('useChunkFetch must be used within ChunkFetchProvider');
  }
  return context;
}
