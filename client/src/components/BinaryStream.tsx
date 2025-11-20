import { useEffect, useState, useRef, useMemo } from 'react';

interface BinaryStreamProps {
  chunkData: ArrayBuffer | null;
  isLoading: boolean;
}

export default function BinaryStream({ chunkData, isLoading }: BinaryStreamProps) {
  const [binaryString, setBinaryString] = useState('');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!chunkData) return;

    // Convert chunk data to a long binary string
    const uint8Array = new Uint8Array(chunkData);
    let binary = '';
    
    // Take first 1000 bytes and convert to binary for a longer string
    const sampleSize = Math.min(1000, uint8Array.length);
    for (let i = 0; i < sampleSize; i++) {
      const byte = uint8Array[i];
      binary += byte.toString(2).padStart(8, '0') + ' ';
    }
    
    setBinaryString(binary);
  }, [chunkData]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Create a rectangular path around the viewport perimeter
  const pathData = useMemo(() => {
    const padding = 10;
    const w = dimensions.width - padding * 2;
    const h = dimensions.height - padding * 2;
    
    // Create a rectangular path: start top-left, go clockwise
    return `M ${padding} ${padding} L ${w + padding} ${padding} L ${w + padding} ${h + padding} L ${padding} ${h + padding} Z`;
  }, [dimensions]);

  // Calculate approximate path length for animation
  const pathLength = useMemo(() => {
    const w = dimensions.width - 20;
    const h = dimensions.height - 20;
    return 2 * (w + h);
  }, [dimensions]);

  // Repeat binary string enough times to fill the path
  const repeatedBinary = useMemo(() => {
    if (!binaryString) return '';
    const repeatCount = Math.ceil(pathLength / 50) + 5; // Extra for smooth loop
    return binaryString.repeat(repeatCount);
  }, [binaryString, pathLength]);

  if (!binaryString || !dimensions.width) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <path
            id="border-path"
            d={pathData}
            fill="none"
            stroke="none"
          />
        </defs>
        
        <text
          fill="hsl(var(--primary) / 0.4)"
          fontSize="10"
          fontFamily="monospace"
          letterSpacing="2"
        >
          <textPath href="#border-path" startOffset="0">
            {repeatedBinary}
            <animate
              attributeName="startOffset"
              from="0"
              to={pathLength}
              dur="40s"
              repeatCount="indefinite"
            />
          </textPath>
        </text>
      </svg>
    </div>
  );
}
