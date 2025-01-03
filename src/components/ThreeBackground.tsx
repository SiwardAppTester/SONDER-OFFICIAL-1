import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';

export function Loader() {
  return (
    <Html center>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_0ms]"></div>
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_200ms]"></div>
        <div className="w-3 h-3 rounded-full bg-white/80 animate-[bounce_1s_infinite_400ms]"></div>
      </div>
    </Html>
  );
}

export function InnerSphere() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh scale={[-15, -15, -15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
    </>
  );
}

export function ThreeBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas
        className="w-full h-full"
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={<Loader />}>
          <InnerSphere />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Default export for backward compatibility
export default ThreeBackground; 