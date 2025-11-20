import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VissonanceVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

export default function VissonanceVisualizer({ audioElement, isPlaying }: VissonanceVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const geometriesRef = useRef<THREE.Mesh[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioConnectedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    
    if (isPlaying && audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(err => {
        console.warn('Failed to resume AudioContext:', err);
      });
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!containerRef.current || !audioElement) return;

    const container = containerRef.current;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.0008);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
    camera.position.z = 1000;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (!audioCtxRef.current) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      if (!audioConnectedRef.current) {
        try {
          const source = audioCtx.createMediaElementSource(audioElement);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
          sourceRef.current = source;
          audioConnectedRef.current = true;
        } catch (e) {
          console.warn('Audio source already connected or error:', e);
        }
      }
    }

    const bars: THREE.Mesh[] = [];
    const barCount = 128;
    const radius = 400;

    for (let i = 0; i < barCount; i++) {
      const geometry = new THREE.BoxGeometry(10, 100, 10);
      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(i / barCount, 1, 0.5),
        emissive: new THREE.Color().setHSL(i / barCount, 1, 0.3),
        transparent: true,
        opacity: 0.8,
      });
      const bar = new THREE.Mesh(geometry, material);

      const angle = (i / barCount) * Math.PI * 2;
      bar.position.x = Math.cos(angle) * radius;
      bar.position.z = Math.sin(angle) * radius;
      bar.position.y = 0;

      bar.lookAt(scene.position);
      
      scene.add(bar);
      bars.push(bar);
    }

    geometriesRef.current = bars;

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 1, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (analyserRef.current && dataArrayRef.current && isPlayingRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        bars.forEach((bar, i) => {
          const dataIndex = Math.floor((i / barCount) * dataArrayRef.current!.length);
          const value = dataArrayRef.current![dataIndex] / 255;
          
          bar.scale.y = 0.5 + value * 5;
          bar.position.y = (value * 200) - 100;
          
          const material = bar.material as THREE.MeshPhongMaterial;
          material.emissive.setHSL(i / barCount, 1, value * 0.5);
        });
      }

      camera.rotation.y += 0.001;
      
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      bars.forEach(bar => {
        if (bar.geometry) bar.geometry.dispose();
        if (bar.material) {
          if (Array.isArray(bar.material)) {
            bar.material.forEach(mat => mat.dispose());
          } else {
            bar.material.dispose();
          }
        }
        scene.remove(bar);
      });

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();

      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
          sourceRef.current = null;
        } catch (e) {
          console.warn('Error disconnecting audio source:', e);
        }
      }

      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
          audioCtxRef.current = null;
        } catch (e) {
          console.warn('Error closing audio context:', e);
        }
      }

      audioConnectedRef.current = false;
    };
  }, [audioElement]);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 z-0"
      style={{ background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0f0f1e 100%)' }}
    />
  );
}
