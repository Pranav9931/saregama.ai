import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BinaryParticle {
  id: string;
  binary: string;
  edge: 'top' | 'right' | 'bottom' | 'left';
  position: number;
  speed: number;
}

interface BinaryStreamProps {
  chunkData: ArrayBuffer | null;
  isLoading: boolean;
}

export default function BinaryStream({ chunkData, isLoading }: BinaryStreamProps) {
  const [particles, setParticles] = useState<BinaryParticle[]>([]);
  const particleIdRef = useRef(0);

  useEffect(() => {
    if (!chunkData || !isLoading) return;

    // Convert chunk data to binary strings
    const uint8Array = new Uint8Array(chunkData);
    const binaryStrings: string[] = [];
    
    // Take first 200 bytes and convert to binary
    const sampleSize = Math.min(200, uint8Array.length);
    for (let i = 0; i < sampleSize; i += 4) {
      const byte = uint8Array[i];
      const binary = byte.toString(2).padStart(8, '0');
      binaryStrings.push(binary);
    }

    // Create particles from binary data on all edges
    const edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
    const newParticles: BinaryParticle[] = [];

    binaryStrings.forEach((binary, index) => {
      const edge = edges[index % edges.length];
      newParticles.push({
        id: `particle-${particleIdRef.current++}`,
        binary,
        edge,
        position: (index / sampleSize) * 100,
        speed: 15 + Math.random() * 10,
      });
    });

    setParticles(prev => [...prev, ...newParticles]);

    // Clean up old particles
    const cleanup = setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 8000);

    return () => clearTimeout(cleanup);
  }, [chunkData, isLoading]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => {
          const isHorizontal = particle.edge === 'top' || particle.edge === 'bottom';
          
          return (
            <motion.div
              key={particle.id}
              initial={{
                opacity: 0,
                ...(particle.edge === 'top' && { top: 0, left: `${particle.position}%`, x: '-50%' }),
                ...(particle.edge === 'bottom' && { bottom: 0, left: `${particle.position}%`, x: '-50%' }),
                ...(particle.edge === 'left' && { left: 0, top: `${particle.position}%`, y: '-50%' }),
                ...(particle.edge === 'right' && { right: 0, top: `${particle.position}%`, y: '-50%' }),
              }}
              animate={{
                opacity: [0, 0.6, 0.6, 0],
                ...(particle.edge === 'top' && { 
                  y: ['0%', '100vh'],
                }),
                ...(particle.edge === 'bottom' && { 
                  y: ['0%', '-100vh'],
                }),
                ...(particle.edge === 'left' && { 
                  x: ['0%', '100vw'],
                }),
                ...(particle.edge === 'right' && { 
                  x: ['0%', '-100vw'],
                }),
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: particle.speed,
                ease: 'linear',
              }}
              className="absolute text-primary/40 font-mono whitespace-nowrap"
              style={{ fontSize: '8px', letterSpacing: '1px' }}
            >
              {particle.binary}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
