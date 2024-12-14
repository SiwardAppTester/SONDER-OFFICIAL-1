import React from "react";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Loader component for Suspense fallback
function Loader() {
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

// Sphere component
function FloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 2, 0]} scale={[6, 6, 6]} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1}
        transparent
        opacity={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 20]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <FloatingShell />
    </>
  );
}

const AboutUs: React.FC = () => {
  return (
    <>
      {/* Sphere Container - Fixed height */}
      <div className="relative w-full bg-black pt-24">
        {/* Sign In Button */}
        <div className="fixed top-8 right-8 z-50">
          <button className="bg-[#FF6B00] text-white px-12 py-2 rounded-full text-sm font-medium tracking-wider hover:bg-[#FF8533] transition-colors">
            SIGN IN
          </button>
        </div>

        {/* Background with sphere - Fixed height */}
        <div className="absolute inset-0 h-[300vh] bg-black">
          <Canvas
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 20], fov: 75 }}
          >
            <Suspense fallback={<Loader />}>
              <Scene />
            </Suspense>
          </Canvas>
          <div className="absolute inset-0 backdrop-blur-[30px] bg-black/20" />
        </div>

        {/* Content that overlaps with sphere */}
        <div className="relative h-[300vh]">
          {/* Hero Section */}
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <div className="mt-64">
              <h1 className="text-[4rem] md:text-[6rem] font-bold text-white leading-[0.8] tracking-wide mb-6">
                MOMENTS YOU<br />
                HAVE MISSED
              </h1>
              
              <div className="text-white/60 text-lg md:text-xl space-y-1">
                <p>we're not here to fight the new technology.</p>
                <p>we're here to <span className="text-white">reclaim connection</span>.</p>
              </div>

              {/* Explore More Button */}
              <div className="text-white/60 mt-48">
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:text-white/80 transition-colors">
                  <span className="text-lg">explore more</span>
                  <svg 
                    width="24" 
                    height="24" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="animate-bounce"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                </div>
              </div>

              {/* New Text Section */}
              <div className="mt-[20vh] max-w-5xl -ml-32 text-left">
                <h2 className="text-[2.5rem] md:text-[3.5rem] text-white/40 font-light leading-none mb-4">
                  We have become spectators<br />
                  of our own lives.
                </h2>
                <p className="text-lg md:text-xl text-white">
                  Capturing, but not living.
                </p>
              </div>

              {/* Centered Question Section */}
              <div className="mt-[28rem] text-center max-w-4xl mx-auto">
                <p className="text-white/40 text-xl mb-4">
                  and let's face it
                </p>
                <h2 className="text-[2rem] md:text-[2.75rem] text-white font-bold tracking-wide leading-tight">
                  ARE WE CAPTURING THESE MOMENTS<br />
                  TO REMEMBER, OR TO PROVE WE WERE<br />
                  THERE?
                </h2>
              </div>

              {/* New Wave Section */}
              <div className="mt-96 text-left max-w-4xl mx-auto">
                <h2 className="text-[2rem] md:text-[3rem] text-white font-bold leading-[1.1]">
                  Entering<br />
                  The New<br />
                  Wave Of<br />
                  Partying
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Content Container - Can extend without affecting sphere */}
      <div className="relative w-full bg-black -mt-64">
        {/* Description Section */}
        <div className="max-w-4xl mx-auto text-right px-4 py-16">
          <p className="text-[1.5rem] md:text-[2rem] text-white/40 leading-tight">
            It's not just about capturing<br />
            memories; it's about <span className="text-white">giving</span><br />
            people the <span className="text-white">space to be present</span>,<br />
            knowing the memory will be<br />
            curated and stored for them.
          </p>
          <a href="#" className="inline-block mt-8 text-white text-lg border-b-2 border-white hover:text-white/80 transition-colors">
            READ MORE
          </a>
        </div>

        {/* Partner Section */}
        <div className="max-w-4xl mx-auto mt-32 px-4">
          <div className="backdrop-blur-xl bg-white/5 rounded-[2rem] p-16 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
            <div className="space-y-8">
              <div>
                <h3 className="text-white/60 text-4xl font-light mb-2">
                  partner with
                </h3>
                <h2 className="text-white text-7xl font-bold">
                  SONDER
                </h2>
              </div>

              <p className="text-white/40 text-xl leading-relaxed max-w-2xl">
                Sonder's platform is designed to take the guesswork 
                out of content management and audience engagement. 
                By combining real-time metrics, audience insights, and 
                effortless organisation, <span className="text-white">we help festivals and events 
                transform their content into a strategic advantage.</span>
              </p>

              <div>
                <button className="bg-[#FF6B00] text-white px-10 py-4 rounded-full 
                                 text-lg font-medium hover:bg-[#FF8533] transition-colors
                                 hover:scale-105 active:scale-95 transform duration-200">
                  GET STARTED
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AboutUs; 