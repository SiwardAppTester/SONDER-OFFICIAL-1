import React, { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';
import { gsap } from 'gsap';

// Loader component for Suspense fallback
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white/80 rounded-full animate-spin"></div>
        <div className="text-white/80 text-sm mt-4 font-['Space_Grotesk']">
          {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  )
}

// Enhanced sphere with animation (simplified)
function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.15;
    }
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 0]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <mesh ref={meshRef} scale={[-15, -15, -15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          side={THREE.BackSide}
          color="#1a1a1a"
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1}
        />
      </mesh>
    </group>
  );
}

const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  // Add back the parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!parallaxRef.current) return;
      
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const moveX = (clientX - innerWidth / 2) / innerWidth;
      const moveY = (clientY - innerHeight / 2) / innerHeight;
      
      gsap.to(parallaxRef.current, {
        x: moveX * 20,
        y: moveY * 20,
        duration: 1,
        ease: "power2.out"
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keep the entrance/exit animations
  useEffect(() => {
    if (location.state?.animateFrom === 'welcome' && contentRef.current) {
      gsap.set(contentRef.current, {
        opacity: 0,
        scale: 0.95
      });

      gsap.to(contentRef.current, {
        opacity: 1,
        scale: 1,
        duration: 1,
        delay: 0.3,
        ease: "power3.out",
      });
    }
  }, [location]);

  const handleBack = () => {
    if (contentRef.current) {
      // Animate out
      gsap.to(contentRef.current, {
        opacity: 0,
        scale: 1.05,
        duration: 0.8,
        ease: "power3.in",
      });

      // Navigate after animation
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 800);
    }
  };

  return (
    <div className="min-h-screen w-full overflow-hidden relative">
      {/* Enhanced Background */}
      <div className="fixed inset-0">
        <Canvas
          className="w-full h-full"
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<Loader />}>
            <AnimatedSphere />
          </Suspense>
        </Canvas>
      </div>

      {/* Animated content wrapper */}
      <div 
        ref={contentRef} 
        className="relative z-10 min-h-screen flex flex-col"
      >
        {/* Back Button */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={handleBack}
            className="relative px-8 py-2 border border-white/20 rounded-full
                    text-white/70 text-sm font-['Space_Grotesk'] tracking-[0.15em]
                    transition-all duration-300 
                    hover:border-white/40 hover:scale-105
                    hover:text-white/90 hover:bg-white/5
                    active:scale-95
                    cursor-pointer"
          >
            BACK
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl w-full grid md:grid-cols-[1.2fr,1fr] gap-16 items-center">
            {/* Left Side - Main Content with parallax */}
            <div 
              ref={parallaxRef}
              className="space-y-12 transition-transform duration-300 ease-out"
            >
              {/* Brand */}
              <div>
                <h1 className="text-7xl md:text-8xl font-['Space_Grotesk'] tracking-[0.2em] 
                             text-white/90 mb-6
                             animate-text bg-gradient-to-r from-white/80 via-white to-white/80 
                             bg-clip-text text-transparent">
                  SONDER
                </h1>
                <p className="text-2xl md:text-3xl text-white/80 
                           font-['Space_Grotesk'] tracking-wide leading-relaxed">
                  Experience the moment.<br />
                  Cherish forever.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-6 max-w-2xl">
                <p className="text-white/70 font-['Space_Grotesk'] text-xl leading-relaxed">
                  In a world where we're constantly connected, Sonder creates a space 
                  for genuine presence and connection. We believe that the most precious 
                  moments deserve our full attention.
                </p>
                <p className="text-white/70 font-['Space_Grotesk'] text-xl leading-relaxed">
                  Our platform encourages you to put down your phone, immerse yourself 
                  in the experience, and trust that your memories will be waiting for you.
                </p>
              </div>
            </div>

            {/* Right Side - Features */}
            <div className="space-y-8">
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
                <div className="w-12 h-[2px] bg-white/40 mb-6"></div>
                <h3 className="text-2xl text-white/90 font-['Space_Grotesk'] mb-4">
                  Be Present
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  Focus on the experience, not documenting it
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
                <div className="w-12 h-[2px] bg-white/40 mb-6"></div>
                <h3 className="text-2xl text-white/90 font-['Space_Grotesk'] mb-4">
                  Stay Connected
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  Share moments meaningfully, not compulsively
                </p>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10">
                <div className="w-12 h-[2px] bg-white/40 mb-6"></div>
                <h3 className="text-2xl text-white/90 font-['Space_Grotesk'] mb-4">
                  Cherish Memories
                </h3>
                <p className="text-white/60 text-lg leading-relaxed">
                  Revisit your experiences when the moment is right
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Quote */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center max-w-xl px-4">
          <p className="text-white/40 font-['Space_Grotesk'] italic text-lg">
            "The best moments in our lives are not the posed ones. They are 
            the moments when we are truly living."
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs; 