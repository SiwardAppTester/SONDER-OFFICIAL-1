import React, { useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Suspense } from 'react';
import { gsap } from 'gsap';
import { useScrollAnimation } from '../hooks/useScrollAnimation';

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
  const rightSectionRef = useRef<HTMLDivElement>(null);

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

  // Update the entrance animation
  useEffect(() => {
    if (location.state?.animateFrom === 'welcome') {
      // Set initial positions
      if (parallaxRef.current) {
        gsap.set(parallaxRef.current, {
          opacity: 0,
          x: -100,
        });
      }
      
      if (rightSectionRef.current) {
        gsap.set(rightSectionRef.current, {
          opacity: 0,
          x: 100,
        });
      }

      // Animate in
      if (parallaxRef.current) {
        gsap.to(parallaxRef.current, {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.3,
          ease: "power3.out",
        });
      }

      if (rightSectionRef.current) {
        gsap.to(rightSectionRef.current, {
          opacity: 1,
          x: 0,
          duration: 1,
          delay: 0.3,
          ease: "power3.out",
        });
      }
    }
  }, [location]);

  const handleBack = () => {
    // Animate out both sections
    if (parallaxRef.current && rightSectionRef.current) {
      // Animate left section
      gsap.to(parallaxRef.current, {
        opacity: 0,
        x: -100,
        duration: 0.8,
        ease: "power3.in",
      });

      // Animate right section
      gsap.to(rightSectionRef.current, {
        opacity: 0,
        x: 100,
        duration: 0.8,
        ease: "power3.in",
      });

      // Navigate after animation
      setTimeout(() => {
        navigate('/', { 
          replace: true,
          state: { from: 'about' }
        });
      }, 800);
    } else {
      // Fallback if refs are not available
      navigate('/', { 
        replace: true,
        state: { from: 'about' }
      });
    }
  };

  // Add these new refs for the additional sections
  const leftSection1Ref = useScrollAnimation('right');
  const rightSection1Ref = useScrollAnimation('left');
  const leftSection2Ref = useScrollAnimation('left');
  const rightSection2Ref = useScrollAnimation('right');
  const leftSection3Ref = useScrollAnimation('right');
  const rightSection3Ref = useScrollAnimation('left');

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Fixed Background */}
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

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col pt-16 pb-16">
        {/* Back Button */}
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
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

        {/* All content wrapped in a consistent container */}
        <div className="container max-w-6xl mx-auto px-4 md:px-8 space-y-24">
          {/* Hero Section */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start pt-12">
            {/* Left Side - Main Content with parallax */}
            <div 
              ref={parallaxRef}
              className="space-y-8"
            >
              {/* Brand */}
              <div>
                <h1 className="text-7xl md:text-8xl font-['Space_Grotesk'] tracking-[0.2em] 
                             text-white/90 mb-4
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
              <div className="space-y-4">
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
            <div 
              ref={rightSectionRef}
              className="space-y-6"
            >
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

          {/* Content Sections */}
          <div className="space-y-24">
            {/* Section 1 */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div 
                ref={rightSection1Ref}
                className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10"
              >
                <div className="space-y-6">
                  <h3 className="text-2xl text-white/90 font-['Space_Grotesk']">
                    Key Features
                  </h3>
                  <ul className="space-y-4 text-white/60 text-lg">
                    <li>• Delayed photo sharing</li>
                    <li>• Mindfulness reminders</li>
                    <li>• Presence tracking</li>
                    <li>• Digital wellbeing insights</li>
                  </ul>
                </div>
              </div>

              <div 
                ref={leftSection1Ref}
                className="space-y-6"
              >
                <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] text-white/90">
                  Mindful Technology
                </h2>
                <p className="text-white/70 font-['Space_Grotesk'] text-xl leading-relaxed">
                  We believe technology should enhance our lives, not consume them. 
                  Sonder is designed with intentionality, helping you strike the perfect 
                  balance between capturing moments and living them.
                </p>
              </div>
            </div>

            {/* Section 2 */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div 
                ref={leftSection2Ref}
                className="space-y-6"
              >
                <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] text-white/90">
                  Community & Connection
                </h2>
                <p className="text-white/70 font-['Space_Grotesk'] text-xl leading-relaxed">
                  Join a community of mindful individuals who value authentic experiences. 
                  Share stories, connect meaningfully, and inspire others to embrace 
                  present-moment awareness.
                </p>
              </div>

              <div 
                ref={rightSection2Ref}
                className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10"
              >
                <div className="space-y-6">
                  <h3 className="text-2xl text-white/90 font-['Space_Grotesk']">
                    Community Features
                  </h3>
                  <ul className="space-y-4 text-white/60 text-lg">
                    <li>• Private sharing circles</li>
                    <li>• Meaningful interactions</li>
                    <li>• Group challenges</li>
                    <li>• Community stories</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
              <div 
                ref={rightSection3Ref}
                className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10"
              >
                <div className="space-y-6">
                  <h3 className="text-2xl text-white/90 font-['Space_Grotesk']">
                    Privacy & Security
                  </h3>
                  <ul className="space-y-4 text-white/60 text-lg">
                    <li>• End-to-end encryption</li>
                    <li>• Customizable privacy settings</li>
                    <li>• Secure data storage</li>
                    <li>• Personal data control</li>
                  </ul>
                </div>
              </div>

              <div 
                ref={leftSection3Ref}
                className="space-y-6"
              >
                <h2 className="text-4xl md:text-5xl font-['Space_Grotesk'] text-white/90">
                  Your Data, Your Control
                </h2>
                <p className="text-white/70 font-['Space_Grotesk'] text-xl leading-relaxed">
                  We believe in putting you in control of your digital footprint. 
                  With Sonder, your memories are yours alone, protected by 
                  industry-leading security measures and privacy controls.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Quote */}
          <div className="text-center max-w-xl mx-auto">
            <p className="text-white/40 font-['Space_Grotesk'] italic text-lg">
              "The best moments in our lives are not the posed ones. They are 
              the moments when we are truly living."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs; 