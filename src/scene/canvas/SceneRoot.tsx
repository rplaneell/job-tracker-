import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';

/**
 * Temporary smoke scene that proves React Three Fiber, drei and WebGL work.
 * Replace with the real isometric headquarters later.
 */
export function SceneRoot() {
  return (
    <Canvas
      data-testid="scene-canvas"
      orthographic
      camera={{ position: [6, 6, 6], zoom: 80 }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 3]} intensity={1.2} />
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <OrbitControls makeDefault enableDamping />
    </Canvas>
  );
}
