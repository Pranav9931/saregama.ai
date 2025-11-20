import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | HTMLVideoElement | null;
  isPlaying: boolean;
  className?: string;
}

export default function AudioVisualizer({
  audioElement,
  isPlaying,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceMapRef = useRef<Map<HTMLAudioElement | HTMLVideoElement, MediaElementAudioSourceNode>>(new Map());
  const activeSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const barsRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const NUM_BARS = 64;
  const BAR_WIDTH = 0.8;
  const BAR_SPACING = 1.2;

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Create bars
    const bars: THREE.Mesh[] = [];
    const startX = -(NUM_BARS * BAR_SPACING) / 2;

    for (let i = 0; i < NUM_BARS; i++) {
      const geometry = new THREE.BoxGeometry(BAR_WIDTH, 1, BAR_WIDTH);
      
      // Create gradient material using vertex colors
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(i / NUM_BARS, 0.8, 0.5),
      });

      const bar = new THREE.Mesh(geometry, material);
      bar.position.x = startX + i * BAR_SPACING;
      bar.position.y = 0;
      scene.add(bar);
      bars.push(bar);
    }
    barsRef.current = bars;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Handle window resize
    const handleResize = () => {
      if (!canvasRef.current || !camera || !renderer) return;
      
      const width = canvasRef.current.clientWidth;
      const height = canvasRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      // Cleanup Three.js resources
      bars.forEach(bar => {
        bar.geometry.dispose();
        (bar.material as THREE.Material).dispose();
      });
      renderer.dispose();
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Setup Web Audio API when audio element changes
  useEffect(() => {
    if (!audioElement) {
      // Disconnect active source when no audio element
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.disconnect();
        } catch (e) {
          // Already disconnected
        }
        activeSourceRef.current = null;
      }
      return;
    }

    // Create or reuse audio context
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const audioCtx = audioCtxRef.current;

    // Create analyser if needed
    if (!analyserRef.current) {
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256; // 128 frequency bins
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      // Connect analyser to destination once
      analyser.connect(audioCtx.destination);
    }

    // Disconnect current active source
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.disconnect();
      } catch (e) {
        // Already disconnected
      }
      activeSourceRef.current = null;
    }

    // Check if we already have a source for this element
    let source = sourceMapRef.current.get(audioElement);

    if (!source) {
      // Create new source for this element
      try {
        source = audioCtx.createMediaElementSource(audioElement);
        sourceMapRef.current.set(audioElement, source);
      } catch (error) {
        console.error('Failed to create audio source:', error);
        return;
      }
    }

    // Connect the source to the analyser
    try {
      source.connect(analyserRef.current);
      activeSourceRef.current = source;
    } catch (e) {
      // Already connected - this is fine
      activeSourceRef.current = source;
    }

    return () => {
      // Don't disconnect on cleanup - only when element changes
      // This prevents audio interruption when visualizer toggles
    };
  }, [audioElement]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !analyserRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }

    const analyser = analyserRef.current;
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const bars = barsRef.current;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      if (!isPlaying) return;

      animationFrameRef.current = requestAnimationFrame(animate);

      // Get frequency data
      analyser.getByteFrequencyData(dataArray);

      // Update bars
      const step = Math.floor(bufferLength / NUM_BARS);
      
      for (let i = 0; i < NUM_BARS; i++) {
        const index = i * step;
        const value = dataArray[index] / 255; // Normalize to 0-1
        
        // Scale bar height with smooth animation
        const targetHeight = Math.max(0.1, value * 20);
        const currentHeight = bars[i].scale.y;
        bars[i].scale.y = currentHeight + (targetHeight - currentHeight) * 0.3;
        
        // Position bar so it grows upward from y=0
        bars[i].position.y = bars[i].scale.y / 2;
        
        // Update color based on intensity
        const hue = i / NUM_BARS;
        const lightness = 0.3 + value * 0.4;
        (bars[i].material as THREE.MeshBasicMaterial).color.setHSL(hue, 0.8, lightness);
      }

      // Rotate camera slightly for dynamic effect
      camera.position.x = Math.sin(Date.now() * 0.0001) * 5;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-testid="canvas-visualizer"
    />
  );
}
