import { useEffect, useState } from 'react';

interface BinaryStreamProps {
  chunkData: ArrayBuffer | null;
  isLoading: boolean;
}

export default function BinaryStream({ chunkData, isLoading }: BinaryStreamProps) {
  const [binaryString, setBinaryString] = useState('');

  useEffect(() => {
    if (!chunkData) return;

    // Convert chunk data to binary string (lightweight)
    const uint8Array = new Uint8Array(chunkData);
    let binary = '';
    
    // Take just 100 bytes to keep it lightweight
    const sampleSize = Math.min(100, uint8Array.length);
    for (let i = 0; i < sampleSize; i++) {
      const byte = uint8Array[i];
      binary += byte.toString(2).padStart(8, '0');
    }
    
    setBinaryString(binary);
  }, [chunkData]);

  if (!binaryString) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-3 flex items-center">
        <div className="whitespace-nowrap font-mono text-[8px] text-primary/30 animate-scroll-right" style={{ letterSpacing: '1px' }}>
          {binaryString}
        </div>
      </div>
      
      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-end">
        <div className="whitespace-nowrap font-mono text-[8px] text-primary/30 animate-scroll-left" style={{ letterSpacing: '1px' }}>
          {binaryString}
        </div>
      </div>
      
      {/* Left border */}
      <div className="absolute left-0 top-0 bottom-0 w-3 flex flex-col items-center">
        <div className="font-mono text-[8px] text-primary/30 animate-scroll-down" style={{ letterSpacing: '1px', writingMode: 'vertical-rl' }}>
          {binaryString}
        </div>
      </div>
      
      {/* Right border */}
      <div className="absolute right-0 top-0 bottom-0 w-3 flex flex-col items-center justify-end">
        <div className="font-mono text-[8px] text-primary/30 animate-scroll-up" style={{ letterSpacing: '1px', writingMode: 'vertical-rl' }}>
          {binaryString}
        </div>
      </div>
    </div>
  );
}
