import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Spectrum } from '@/lib/Spectrum';

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
  const groupRef = useRef<THREE.Object3D | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioConnectedRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const spectrumRef = useRef(new Spectrum());

  const fftSize = 4096;
  const numBars = 128;

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
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 10000);
    camera.position.y = 0;
    camera.position.z = 250;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    if (!audioCtxRef.current) {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = fftSize;
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

    const group = new THREE.Object3D();
    groupRef.current = group;

    const vertexShader = `
      varying vec4 pos;
      void main() {
        pos = modelViewMatrix * vec4( position, 1.0 );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `;

    const fragmentShader = `
      uniform vec3 col;
      varying vec4 pos;
      void main() {
        gl_FragColor = vec4( -pos.z/180.0 * col.r, -pos.z/180.0 * col.g, -pos.z/180.0 * col.b, 1.0 );
      }
    `;

    for (let i = 0; i < numBars / 2; i++) {
      const uniforms = {
        col: { value: new THREE.Color('hsl(240, 100%, 50%)') },
      };

      const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
      });

      let geometry = new THREE.PlaneGeometry(3, 500, 1);
      geometry.rotateX(Math.PI / 1.8);
      geometry.translate(0, 60, 0);
      let plane = new THREE.Mesh(geometry, material);
      plane.rotation.z = i * (Math.PI * 2 / numBars) + (Math.PI / numBars);
      group.add(plane);

      geometry = new THREE.PlaneGeometry(3, 500, 1);
      geometry.rotateX(Math.PI / 1.8);
      geometry.translate(0, 60, 0);
      plane = new THREE.Mesh(geometry, material);
      plane.rotation.z = -i * (Math.PI * 2 / numBars) - (Math.PI / numBars);
      group.add(plane);
    }

    scene.add(group);

    let animationId: number;

    const modn = (n: number, m: number) => ((n % m) + m) % m;

    const getLoudness = (arr: Uint8Array): number => {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
      }
      return sum / arr.length;
    };

    const setUniformColor = (groupIndex: number, loudness: number) => {
      const h = modn(250 - loudness * 2.2, 360);
      const mesh = group.children[groupIndex] as THREE.Mesh;
      const material = mesh.material as THREE.ShaderMaterial;
      material.uniforms.col.value = new THREE.Color(`hsl(${h}, 100%, 50%)`);
    };

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (analyserRef.current && dataArrayRef.current && isPlayingRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const loudness = getLoudness(dataArrayRef.current);
        const visualArray = spectrumRef.current.GetVisualBins(dataArrayRef.current, numBars, 4, 1300);

        for (let i = 0; i < visualArray.length / 2; i++) {
          setUniformColor(i * 2, loudness);

          const mesh1 = group.children[i * 2] as THREE.Mesh;
          const geometry1 = mesh1.geometry as THREE.BufferGeometry;
          const positions1 = geometry1.attributes.position.array as Float32Array;
          
          positions1[7] = visualArray[i] / 2 + (65 + loudness / 1.5);
          positions1[10] = visualArray[i] / 2 + (65 + loudness / 1.5);
          geometry1.attributes.position.needsUpdate = true;

          const mesh2 = group.children[i * 2 + 1] as THREE.Mesh;
          const geometry2 = mesh2.geometry as THREE.BufferGeometry;
          const positions2 = geometry2.attributes.position.array as Float32Array;
          
          positions2[7] = visualArray[i] / 2 + (65 + loudness / 1.5);
          positions2[10] = visualArray[i] / 2 + (65 + loudness / 1.5);
          geometry2.attributes.position.needsUpdate = true;
        }
      }

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
      
      if (group) {
        group.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => mat.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        });
        scene.remove(group);
      }

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
      style={{ background: 'radial-gradient(ellipse at center, #0a0a1e 0%, #000000 100%)' }}
    />
  );
}
