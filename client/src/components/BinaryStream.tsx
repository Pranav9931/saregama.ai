import { useEffect, useState } from 'react';

interface BinaryStreamProps {
  chunkData: ArrayBuffer | null;
  isLoading: boolean;
}

export default function BinaryStream({ chunkData, isLoading }: BinaryStreamProps) {
  const [binaryString, setBinaryString] = useState('');

  useEffect(() => {
    if (!chunkData) return;

    // Convert chunk data to a long binary string
    const uint8Array = new Uint8Array(chunkData);
    let binary = '';
    
    // Take first 500 bytes and convert to binary
    const sampleSize = Math.min(500, uint8Array.length);
    for (let i = 0; i < sampleSize; i++) {
      const byte = uint8Array[i];
      binary += byte.toString(2).padStart(8, '0');
    }
    
    setBinaryString(binary);
  }, [chunkData]);

  if (!binaryString) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Top Edge */}
      <div className="absolute top-2 left-0 right-0 overflow-hidden h-4">
        <div 
          className="absolute whitespace-nowrap font-mono text-primary/40 animate-scroll-right"
          style={{ fontSize: '10px', letterSpacing: '2px' }}
        >
          {binaryString.repeat(3)}
        </div>
      </div>
      
      {/* Bottom Edge */}
      <div className="absolute bottom-2 left-0 right-0 overflow-hidden h-4">
        <div 
          className="absolute whitespace-nowrap font-mono text-primary/40 animate-scroll-left"
          style={{ fontSize: '10px', letterSpacing: '2px' }}
        >
          {binaryString.repeat(3)}
        </div>
      </div>
      
      {/* Left Edge */}
      <div className="absolute left-2 top-0 bottom-0 overflow-hidden w-4">
        <div 
          className="absolute font-mono text-primary/40 animate-scroll-down"
          style={{ 
            fontSize: '10px', 
            letterSpacing: '2px',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)'
          }}
        >
          {binaryString.repeat(3)}
        </div>
      </div>
      
      {/* Right Edge */}
      <div className="absolute right-2 top-0 bottom-0 overflow-hidden w-4">
        <div 
          className="absolute font-mono text-primary/40 animate-scroll-up"
          style={{ 
            fontSize: '10px', 
            letterSpacing: '2px',
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)'
          }}
        >
          {binaryString.repeat(3)}
        </div>
      </div>
    </div>
  );
}
