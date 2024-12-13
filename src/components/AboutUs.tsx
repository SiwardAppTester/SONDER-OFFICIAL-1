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

const BrandStoryText: React.FC = () => {
  return (
    <div className="relative transform-gpu perspective-[1000px] rotate-[-25deg]">
      {/* Create multiple layers for 3D effect */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            transform: `translateZ(${-i * 10}px)`,
            opacity: i === 0 ? 1 : (1 - i * 0.15)
          }}
        >
          <div className="text-white text-3xl font-bold tracking-[0.5em] whitespace-nowrap">
            OUR BRAND STORY
          </div>
        </div>
      ))}
    </div>
  );
};

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
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[15, 15, 15]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1}
        transparent
        opacity={0.9}
      />
    </mesh>
  );
}

function Scene() {
  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={[0, 0, 5]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <FloatingShell />
    </>
  );
}

const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const rightSectionRef = useRef<HTMLDivElement>(null);
  const textSectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Keep the parallax effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const moveX = (clientX - innerWidth / 2) / innerWidth;
      const moveY = (clientY - innerHeight / 2) / innerHeight;
      
      textSectionsRef.current.forEach((element) => {
        if (!element) return;
        
        gsap.to(element, {
          x: moveX * 20,
          y: moveY * 20,
          duration: 1,
          ease: "power2.out"
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keep the entrance animation
  useEffect(() => {
    if (location.state?.animateFrom === 'welcome') {
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
    if (parallaxRef.current && rightSectionRef.current) {
      gsap.to(parallaxRef.current, {
        opacity: 0,
        x: -100,
        duration: 0.8,
        ease: "power3.in",
      });

      gsap.to(rightSectionRef.current, {
        opacity: 0,
        x: 100,
        duration: 0.8,
        ease: "power3.in",
      });

      setTimeout(() => {
        navigate('/', { 
          replace: true,
          state: { from: 'about' }
        });
      }, 800);
    } else {
      navigate('/', { 
        replace: true,
        state: { from: 'about' }
      });
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex justify-end items-center">
        <div className="flex items-center gap-8">
          <a href="#" className="text-white/80 hover:text-white transition-colors">our platform</a>
          <a href="#" className="text-white/80 hover:text-white transition-colors">about us</a>
          <a href="#" className="text-white/80 hover:text-white transition-colors">blog</a>
          <button className="bg-[#FF6B00] text-white px-6 py-2 rounded-full hover:bg-[#FF8533] transition-colors">
            SIGN IN
          </button>
        </div>
      </nav>

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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col px-4">
        {/* Centered Text Content */}
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[5rem] md:text-[7rem] font-bold text-white leading-none mb-4">
              MOMENTS YOU<br />
              HAVE MISSED
            </h1>
            
            <div className="text-white/60 text-xl md:text-2xl space-y-2 mb-16">
              <p>we're not here to fight the new technology.</p>
              <p>we're here to <span className="text-white">reclaim connection</span>.</p>
            </div>
          </div>
        </div>

        {/* Explore More Button - Fixed to bottom */}
        <div className="pb-16 text-white/60">
          <div className="flex flex-col items-center gap-2 cursor-pointer hover:text-white/80 transition-colors">
            <span>explore more</span>
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
      </div>

      {/* Second Section */}
      <div className="relative z-10 min-h-screen flex flex-col justify-start px-4 md:px-16 lg:px-32 pt-32">
        <div className="max-w-5xl">
          <h2 className="text-[3.5rem] md:text-[4.5rem] text-white/40 font-light leading-tight mb-6">
            We have become spectators<br />
            of our own lives.
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-32">
            Capturing, but not living.
          </p>
        </div>
      </div>

      {/* Third Section */}
      <div className="relative z-10 min-h-screen flex flex-col justify-start items-center px-4 -mt-[40vh]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white/40 text-xl mb-6">and let's face it</p>
          <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold text-white leading-tight">
            ARE WE CAPTURING THESE MOMENTS<br />
            TO REMEMBER, OR TO PROVE WE WERE<br />
            THERE?
          </h2>
        </div>
      </div>

      {/* Fourth Section */}
      <div className="relative z-10 min-h-screen flex justify-between items-start px-4 md:px-16 lg:px-32">
        {/* Left Side */}
        <div className="max-w-md -mt-64">
          <h2 className="text-[2.5rem] md:text-[3.5rem] text-white font-bold leading-tight">
            Entering<br />
            The New<br />
            Wave Of<br />
            Partying
          </h2>
        </div>

        {/* Right Side */}
        <div className="max-w-md text-right self-center">
          <div className="relative">
            {/* Brand Story Text */}
            <div className="absolute -top-32 -left-32">
              <div className="transform-gpu">
                <BrandStoryText />
              </div>
            </div>
            
            <p className="text-white/40 text-xl leading-relaxed mb-8">
              It's not just about capturing<br />
              memories; it's about <span className="text-white">giving</span><br />
              people the <span className="text-white">space to be present</span>,<br />
              knowing the memory will be<br />
              curated and stored for them.
            </p>

            <a href="#" className="text-white inline-block border-b-2 border-white hover:text-white/80 transition-colors">
              READ MORE
            </a>
          </div>
        </div>
      </div>

      {/* Fifth Section - Partner with Sonder */}
      <div className="relative z-10 min-h-screen flex items-center px-4 md:px-16 lg:px-32">
        <div className="w-full max-w-4xl mx-auto">
          <div className="backdrop-blur-xl bg-white/5 rounded-[2rem] p-16 
                         border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
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

      {/* Sixth Section - Features */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-16 lg:px-32 text-center">
        <div className="max-w-[90rem] mx-auto space-y-16">
          <div className="space-y-4">
            <p className="text-white/40 text-xl">our features</p>
            <h2 className="text-[1.75rem] md:text-[2.5rem] font-bold text-white leading-tight">
              WITH SONDER, YOU WILL NOT ONLY UNDERSTAND WHAT WORKS.<br />
              YOU WILL KNOW WHY IT WORKS AND HOW TO DO IT <span className="border-b-2">BETTER</span>.
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <button className="bg-[#FF6B00] text-white px-8 py-3 rounded-full 
                             text-lg font-medium hover:bg-[#FF8533] transition-colors">
              EVENTS
            </button>
            <button className="border border-[#FF6B00] text-white px-8 py-3 rounded-full 
                             text-lg font-medium hover:bg-[#FF6B00]/10 transition-colors">
              CHAT
            </button>
            <button className="border border-[#FF6B00] text-white px-8 py-3 rounded-full 
                             text-lg font-medium hover:bg-[#FF6B00]/10 transition-colors">
              CRM
            </button>
            <button className="border border-[#FF6B00] text-white px-8 py-3 rounded-full 
                             text-lg font-medium hover:bg-[#FF6B00]/10 transition-colors">
              ROLES
            </button>
          </div>

          {/* Event Management Content */}
          <div className="mt-32 w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            {/* Left Side - Guest List UI */}
            <div className="backdrop-blur-xl bg-black/40 rounded-[2rem] p-8 max-w-3xl mx-auto">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex justify-between items-center text-white/60 text-sm pb-2 border-b border-white/10">
                  <div className="flex gap-12">
                    <span>Name</span>
                    <span>Got in</span>
                    <span>Sign up</span>
                    <span>Tariff</span>
                  </div>
                </div>

                {/* Guest List Items */}
                {[
                  { name: 'Luke Kenny', gotIn: '0', signUp: '4', status: 'Special offer' },
                  { name: 'Thomas Smith', gotIn: '4', signUp: '4', status: 'Special offer', active: true },
                  { name: 'Robert Johnson', gotIn: '0', signUp: '7', status: 'Special offer' },
                  { name: 'Carl Pett', gotIn: '2', signUp: '2', status: 'Friends&family', active: true },
                  { name: 'Joseph Martin', gotIn: '3', signUp: '4', status: 'Special offer', active: true },
                  { name: 'Alice P.', gotIn: '4', signUp: '4', status: 'Special offer', active: true },
                  { name: 'Martin P.', gotIn: '0', signUp: '5', status: 'Special offer' },
                  { name: 'Roy V.', gotIn: '0', signUp: '3', status: 'Friends&family' },
                  { name: 'Grace Williams', gotIn: '3', signUp: '4', status: 'Special offer', active: true }
                ].map((guest, index) => (
                  <div key={index} className="flex justify-between items-center text-white/80 py-2">
                    <div className="flex gap-12 items-center">
                      {guest.active && <div className="w-2 h-2 rounded-full bg-green-400 absolute -ml-4" />}
                      <span className="w-32">{guest.name}</span>
                      <span className="w-12 text-center">{guest.gotIn}</span>
                      <span className="w-12 text-center">{guest.signUp}</span>
                      <span className={`text-sm ${guest.status === 'Friends&family' ? 'text-orange-400' : 'text-green-400'}`}>
                        {guest.status}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Stats */}
                <div className="flex justify-between items-center text-white/60 text-sm pt-4 border-t border-white/10">
                  <span>GUEST LISTS</span>
                  <span className="text-green-400">+9.8%</span>
                </div>
                <div className="flex justify-between items-center text-white/60 text-sm">
                  <span>REAL TIME</span>
                  <span>421/500 | 84.2%</span>
                </div>
              </div>
            </div>

            {/* Right Side - Text Content */}
            <div className="text-left space-y-6">
              <h3 className="text-4xl md:text-5xl font-bold text-white">
                Customizable Event<br />Management
              </h3>
              <p className="text-white/60 text-xl leading-relaxed">
                Effortlessly create events,<br />
                define content categories, and<br />
                assign QR or access codes to<br />
                ensure attendees view only<br />
                the content relevant to them.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-16 lg:px-32">
        <div className="max-w-7xl w-full">
          {/* Title */}
          <div className="flex justify-end mb-16">
            <h2 className="text-4xl">
              <span className="text-white/40">our</span>
              <span className="text-white ml-3">partners</span>
            </h2>
          </div>

          {/* Partners Logo Container */}
          <div className="backdrop-blur-xl bg-[#1E1E1E]/60 rounded-[2rem] p-12">
            <div className="flex flex-wrap justify-between items-center gap-8">
              {/* Intercell Logo */}
              <div className="w-32">
                <img 
                  src="/images/partners/intercell.jpg" 
                  alt="Intercell" 
                  className="w-full h-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    console.error('Error loading Intercell logo');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Cova Santa Logo */}
              <div className="w-40">
                <img 
                  src="/images/partners/cova-santa.jpg" 
                  alt="Cova Santa" 
                  className="w-full h-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    console.error('Error loading Cova Santa logo');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* DGTL Logo */}
              <div className="w-32">
                <img 
                  src="/images/partners/dgtl.jpg" 
                  alt="DGTL" 
                  className="w-full h-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    console.error('Error loading DGTL logo');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              {/* Amnesia Logo */}
              <div className="w-36">
                <img 
                  src="/images/partners/amnesia.jpg" 
                  alt="Amnesia Ibiza" 
                  className="w-full h-auto object-contain opacity-80 hover:opacity-100 transition-opacity"
                  onError={(e) => {
                    console.error('Error loading Amnesia logo');
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-16 lg:px-32">
        {/* Canvas for 3D sphere */}
        <div className="absolute inset-0">
          <Canvas
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={<Loader />}>
              <Scene />
            </Suspense>
          </Canvas>
        </div>

        {/* Content */}
        <div className="relative z-20 text-center space-y-8">
          {/* Small text above */}
          <p className="text-white/60 text-lg">
            are you ready?
          </p>

          {/* Main heading */}
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white max-w-4xl mx-auto leading-tight">
            BE A PART OF THE<br />
            NEXT BIG THING
          </h2>

          {/* CTA Button */}
          <div className="mt-12">
            <button 
              className="bg-[#FF6B00] text-white px-8 py-4 rounded-full 
                         text-lg font-medium hover:bg-[#FF8533] transition-colors
                         hover:scale-105 active:scale-95 transform duration-200"
            >
              GET STARTED
            </button>
          </div>
        </div>
      </div>

      {/* Follow Our Journey Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 md:px-16 lg:px-32">
        <div className="max-w-7xl w-full text-center space-y-16">
          {/* Title */}
          <div className="space-y-4">
            <p className="text-white/40 text-lg">
              this is just the beginning
            </p>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white">
              FOLLOW OUR JOURNEY
            </h2>
          </div>

          {/* Video and Title Container */}
          <div className="flex items-center gap-8">
            {/* Video Container */}
            <div className="relative aspect-video w-full max-w-3xl">
              <div className="absolute inset-0 backdrop-blur-xl bg-[#1E1E1E]/60 rounded-[2rem] overflow-hidden">
                {/* Video Player */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Play Button */}
                  <button className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center
                                   hover:bg-white/20 transition-colors group">
                    <div className="w-0 h-0 border-t-[12px] border-t-transparent 
                                  border-l-[20px] border-l-white 
                                  border-b-[12px] border-b-transparent
                                  translate-x-1
                                  group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* The Making of Sonder */}
            <div className="text-right flex-shrink-0">
              <h3 className="text-3xl md:text-4xl text-white space-y-1">
                <div>THE</div>
                <div>MAKING</div>
                <div>OF</div>
                <div>SONDER</div>
              </h3>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AboutUs; 