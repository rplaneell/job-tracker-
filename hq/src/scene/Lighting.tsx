import { Environment, Lightformer } from '@react-three/drei';

/** Warm key light, cool soft fill, and a procedural studio environment (no files to download). */
export function Lighting({ shadows }: { shadows: boolean }) {
  return (
    <>
      <hemisphereLight args={['#fff6ea', '#bfcbc0', 0.85]} />
      <directionalLight
        position={[-9, 16, 14]}
        intensity={1.9}
        color="#fff0da"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={5}
      />
      <directionalLight position={[8, 6, -6]} intensity={0.35} color="#cfe0f2" />
      <Environment resolution={256} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={2.2} color="#fff4e4" position={[0, 8, -6]} scale={[14, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#dce9f7" position={[-8, 3, 4]} rotation-y={Math.PI / 2} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#f3dcc0" position={[8, 3, 4]} rotation-y={-Math.PI / 2} scale={[8, 5, 1]} />
      </Environment>
    </>
  );
}
