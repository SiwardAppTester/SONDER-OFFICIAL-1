import React, { useState, Suspense, useRef, useEffect } from "react";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';

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

  // Update scale values for better mobile visibility
  const [scale, setScale] = useState([6, 6, 6]);
  const [position, setPosition] = useState([0, 2, 0]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) { // mobile
        setScale([4.2, 4.2, 4.2]);
        setPosition([0, 6, 0]);
      } else if (width < 768) { // tablet
        setScale([5, 5, 5]);
        setPosition([0, 3, 0]);
      } else { // desktop
        setScale([6, 6, 6]);
        setPosition([0, 2, 0]);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <mesh ref={meshRef} position={position} scale={scale} castShadow>
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

// Update the BottomFloatingShell component
function BottomFloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  const [scale, setScale] = useState([2.5, 2.5, 2.5]);
  const [position, setPosition] = useState([0, 0, 0]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) { // mobile
        setScale([1.5, 1.5, 1.5]);
        setPosition([0, 0.5, 0]);
      } else if (width < 768) { // tablet
        setScale([2, 2, 2]);
        setPosition([0, 0, 0]);
      } else { // desktop
        setScale([2.5, 2.5, 2.5]);
        setPosition([0, 0, 0]);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <mesh ref={meshRef} position={position} scale={scale} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
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
  const [cameraPosition, setCameraPosition] = useState([0, 0, 20]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) { // mobile
        setCameraPosition([0, 0, 25]); // Move camera back for better mobile view
      } else if (width < 768) { // tablet
        setCameraPosition([0, 0, 22]);
      } else { // desktop
        setCameraPosition([0, 0, 20]);
      }
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Environment preset="sunset" />
      <PerspectiveCamera makeDefault position={cameraPosition} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />
      <FloatingShell />
    </>
  );
}

// Add these animation variants after the imports
const fadeInUp = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 2.4,
      ease: "easeOut"
    }
  }
};

// Add this AnimatedText component before the main AboutUs component
function AnimatedText({ children, className = '', delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      style={{ transition: `all 2.4s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}s` }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Then update the main component to use this new navigation
const AboutUs: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string>('EVENTS');
  const [showSignIn, setShowSignIn] = useState(false);
  const [showPartnerSection, setShowPartnerSection] = useState(false);
  const [showFeaturesSection, setShowFeaturesSection] = useState(false);
  const [showPartnersLogoSection, setShowPartnersLogoSection] = useState(false);
  const [showJourneySection, setShowJourneySection] = useState(false);
  const [showBeam, setShowBeam] = useState(false);

  const handleFeatureClick = (feature: string) => {
    console.log('Feature clicked:', feature);
    setSelectedFeature(feature);
  };

  return (
    <>
      {/* Add this style tag at the top of your component */}
      <style>
        {`
          /* Hide scrollbar for Chrome, Safari and Opera */
          ::-webkit-scrollbar {
            display: none;
          }

          /* Hide scrollbar for IE, Edge and Firefox */
          * {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }

          @keyframes rotate {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          .circular-text {
            font-family: 'Space Grotesk', sans-serif;
            opacity: 0.9;
            letter-spacing: 2px;
            text-transform: uppercase;
            filter: drop-shadow(0px 2px 4px rgba(255,255,255,0.1));
          }

          /* Add transform styles */
          .transform-gpu {
            transform: translateZ(0);
            backface-visibility: hidden;
          }

          .perspective-[1000px] {
            perspective: 1000px;
          }

          .rotate-x-[20deg] {
            transform: rotateX(20deg);
          }

          /* Add font styles */
          h1, h2, h3, h4, h5, h6, p, button, a, span, div {
            font-family: 'Space Grotesk', sans-serif;
          }
        `}
      </style>

      {/* Sphere Container - Fixed height */}
      <div className="relative w-full bg-black pt-24">
        {/* Background with sphere - Fixed height */}
        <div className="absolute inset-0 h-[275vh] bg-black">
          <Canvas
            className="w-full h-full"
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 20], fov: window.innerWidth < 640 ? 85 : 75 }}
          >
            <Suspense fallback={<Loader />}>
              <Scene />
            </Suspense>
          </Canvas>
          <div className="absolute inset-0 backdrop-blur-[30px] bg-black/20" />
        </div>

        {/* Content that overlaps with sphere */}
        <div className="relative h-[275vh]">
          {/* Hero Section */}
          <div className="flex flex-col items-center justify-center min-h-screen text-center px-4">
            <div className="mt-32 md:mt-64">
              <AnimatedText className="text-[2.5rem] sm:text-[4rem] md:text-[6rem] font-bold text-white leading-[0.8] tracking-wide mb-6">
                MOMENTS YOU<br />
                HAVE MISSED
              </AnimatedText>
              
              <div className="text-white/60 text-sm sm:text-lg md:text-xl space-y-1">
                <AnimatedText className="px-4" delay={0.2}>
                  we're not here to fight the new technology.
                </AnimatedText>
                <AnimatedText className="px-4" delay={0.4}>
                  we're here to <span className="text-white">reclaim connection</span>.
                </AnimatedText>
              </div>

              {/* Explore More Button */}
              <AnimatedText className="text-white/60 mt-24 pb-4 sm:pb-0 md:mt-48" delay={0.6}>
                <div className="flex flex-col items-center gap-2 cursor-pointer hover:text-white/80 transition-colors">
                  <span className="text-base md:text-lg">explore more</span>
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className="animate-bounce w-4 h-4 md:w-6 md:h-6"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <polyline points="19 12 12 19 5 12"></polyline>
                  </svg>
                </div>
              </AnimatedText>

              {/* Spectators Section */}
              <div className="mt-[20vh] max-w-5xl mx-4 md:-ml-32 text-left">
                <AnimatedText className="text-[2rem] sm:text-[2.5rem] md:text-[3.5rem] text-white/40 font-light leading-none mb-3">
                  We have become spectators<br />
                  of our own lives.
                </AnimatedText>
                <AnimatedText className="text-base sm:text-lg md:text-xl text-white" delay={0.2}>
                  Capturing, but not living.
                </AnimatedText>
              </div>

              {/* Centered Question Section */}
              <div className="mt-[10rem] md:mt-[20rem] text-center max-w-4xl mx-auto px-4">
                <AnimatedText className="text-white/40 text-sm sm:text-base mb-3">
                  and let's face it
                </AnimatedText>
                <AnimatedText 
                  className="text-[1rem] sm:text-[1.75rem] md:text-[2.25rem] text-white font-bold tracking-wide leading-tight" 
                  delay={0.2}
                >
                  ARE WE CAPTURING THESE MOMENTS<br />
                  TO REMEMBER, OR TO PROVE WE WERE<br />
                  THERE?
                </AnimatedText>
              </div>

              {/* New Wave Section - Updated mobile margin */}
              <div className="mt-32 md:mt-96 text-left max-w-4xl mx-auto px-4">
                <h2 className="text-[1.75rem] sm:text-[2rem] md:text-[3rem] text-white font-bold leading-[1.1]">
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
        {/* Orange Beam Background - With fixed height container */}
        {showBeam && (
          <div className="absolute inset-0 overflow-hidden h-[2000px]">
            {/* Main left-side beam */}
            <div className="absolute -left-[400px] top-[30%] w-[1200px] h-[1000px] 
                          bg-[#FF8533] opacity-15 blur-[120px] rotate-[45deg]"></div>
            
            {/* Secondary subtle beam */}
            <div className="absolute -left-[200px] top-[40%] w-[800px] h-[800px] 
                          bg-[#FF9966] opacity-20 blur-[150px] rotate-[30deg]"></div>
            
            {/* Subtle right-side glow */}
            <div className="absolute right-0 top-[50%] w-[500px] h-[800px] 
                          bg-[#FFB380] opacity-10 blur-[180px] rotate-[20deg]"></div>
          </div>
        )}

        {/* Description Section */}
        <div className="max-w-4xl mx-auto text-right px-4 py-0 -mt-[48rem] md:mt-0 md:py-16">
          <p className="text-[1rem] sm:text-[1.5rem] md:text-[2rem] text-white/40 leading-tight">
            It's not just about capturing<br />
            memories; it's about <span className="text-white">giving</span><br />
            people the <span className="text-white">space to be present</span>,<br />
            knowing the memory will be<br />
            curated and stored for them.
          </p>
          <Link 
            to="/read-more" 
            className="inline-block mt-4 md:mt-8 text-sm md:text-lg text-white border-b border-b-white md:border-b-2 hover:text-white/80 transition-colors"
          >
            READ MORE
          </Link>
        </div>

        {/* Partner Section */}
        {showPartnerSection && (
          <div className="max-w-7xl mx-auto mt-16 md:mt-32 px-4">
            <div className="backdrop-blur-xl bg-white/5 rounded-[2rem] p-8 md:p-16 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <div className="space-y-6 md:space-y-8 max-w-4xl">
                <div>
                  <h3 className="text-white/60 text-2xl md:text-4xl font-light mb-2">
                    partner with
                  </h3>
                  <h2 className="text-white text-5xl md:text-7xl font-bold">
                    SONDER
                  </h2>
                </div>

                <p className="text-white/40 text-lg md:text-xl leading-relaxed max-w-2xl">
                  Sonder's platform is designed to take the guesswork 
                  out of content management and audience engagement. 
                  By combining real-time metrics, audience insights, and 
                  effortless organisation, <span className="text-white">we help festivals and events 
                  transform their content into a strategic advantage.</span>
                </p>

                <div>
                  <button className="bg-[#F4A261] text-white px-8 md:px-10 py-3 md:py-4 rounded-full 
                                   text-base md:text-lg font-medium hover:bg-[#E76F51] transition-colors
                                   hover:scale-105 active:scale-95 transform duration-200">
                    GET STARTED
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        {showFeaturesSection && (
          <div className="max-w-7xl mx-auto mt-32 px-4">
            <div className="space-y-12">
              <div className="text-center">
                <p className="text-gray-400 text-base mb-2">our features</p>
                <h2 className="text-white text-2xl md:text-3xl font-bold mx-auto leading-tight max-w-5xl">
                  WITH SONDER, YOU WILL NOT ONLY UNDERSTAND WHAT WORKS.
                  YOU WILL KNOW WHY IT WORKS AND HOW TO DO IT <span className="underline">BETTER</span>.
                </h2>
              </div>

              <div className="flex flex-wrap justify-center gap-4 relative z-50 pointer-events-auto">
                <button 
                  onClick={() => handleFeatureClick('EVENTS')}
                  className={`px-8 py-3 rounded-full transition-colors ${
                    selectedFeature === 'EVENTS' 
                      ? 'bg-[#FF6B00]' 
                      : 'border border-[#FF6B00] hover:bg-[#FF6B00]/10'
                  } text-white cursor-pointer`}
                >
                  EVENTS
                </button>
                <button 
                  onClick={() => handleFeatureClick('CHAT')}
                  className={`px-8 py-3 rounded-full transition-colors ${
                    selectedFeature === 'CHAT' 
                      ? 'bg-[#FF6B00]' 
                      : 'border border-[#FF6B00] hover:bg-[#FF6B00]/10'
                  } text-white cursor-pointer`}
                >
                  CHAT
                </button>
                <button 
                  onClick={() => handleFeatureClick('CRM')}
                  className={`px-8 py-3 rounded-full transition-colors ${
                    selectedFeature === 'CRM' 
                      ? 'bg-[#FF6B00]' 
                      : 'border border-[#FF6B00] hover:bg-[#FF6B00]/10'
                  } text-white cursor-pointer`}
                >
                  CRM
                </button>
                <button 
                  onClick={() => handleFeatureClick('ROLES')}
                  className={`px-8 py-3 rounded-full transition-colors ${
                    selectedFeature === 'ROLES' 
                      ? 'bg-[#FF6B00]' 
                      : 'border border-[#FF6B00] hover:bg-[#FF6B00]/10'
                  } text-white cursor-pointer`}
                >
                  ROLES
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Event Management Description - Separate container */}
        {showFeaturesSection && (
          <div className="relative h-[900px]">
            {/* iPhone Image Container */}
            <div className="absolute top-[100px] right-[800px] w-[280px] h-[542px] bg-white/5 rounded-[40px] border-4 border-white/10 backdrop-blur-xl overflow-hidden">
              {selectedFeature === 'EVENTS' ? (
                <img 
                  src="/images/features/events-screen.jpg" 
                  alt="Events Management Interface"
                  className="w-full h-full object-cover"
                />
              ) : selectedFeature === 'CHAT' ? (
                <img 
                  src="/images/features/chat-screen.jpg" 
                  alt="Chat Interface"
                  className="w-full h-full object-cover"
                />
              ) : selectedFeature === 'CRM' ? (
                <img 
                  src="/images/features/crm-screen.jpg" 
                  alt="CRM Dashboard"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src="/images/features/roles-screen.jpg" 
                  alt="Role Management Interface"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Text Section - Position maintained */}
            <div className="absolute top-[200px] right-[300px] max-w-xl">
              <h3 className="text-white text-4xl font-bold mb-6">
                {selectedFeature === 'EVENTS' ? (
                  <>
                    Customizable Event<br />
                    Management
                  </>
                ) : selectedFeature === 'CHAT' ? (
                  <>
                    Audience Communication<br />
                    Panel
                  </>
                ) : selectedFeature === 'CRM' ? (
                  <>
                    Real-Time<br />
                    Insights
                  </>
                ) : (
                  <>
                    Streamlined Role<br />
                    Management
                  </>
                )}
              </h3>
              <p className="text-white/60 text-xl leading-relaxed max-w-[400px]">
                {selectedFeature === 'EVENTS' ? (
                  <>
                    Effortlessly create events,<br />
                    define content categories, and<br />
                    assign QR or access codes to<br />
                    ensure attendees view only<br />
                    the content relevant to them.
                  </>
                ) : selectedFeature === 'CHAT' ? (
                  <>
                    Stay connected with your audience<br />
                    during events with our real-time<br />
                    communication tools, enabling<br />
                    direct engagement and enhanced<br />
                    event experiences.
                  </>
                ) : selectedFeature === 'CRM' ? (
                  <>
                    Gain live data on user interactions,<br />
                    including downloads, shares, and<br />
                    popular content trends. Use these<br />
                    insights to refine your marketing<br />
                    strategies and improve engagement.
                  </>
                ) : (
                  <>
                    Effortlessly assign roles within your<br />
                    team and create individual accounts<br />
                    tailored to specific responsibilities.<br />
                    Whether it's uploading content,<br />
                    analyzing data, or making announcements.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Partners Section */}
        {showPartnersLogoSection && (
          <div className="max-w-7xl mx-auto px-4 pb-32 -mt-16">
            <div className="space-y-6">
              <div className="flex items-center justify-end">
                <p className="text-gray-400 text-4xl">our</p>
                <p className="text-white text-4xl ml-2">partners</p>
              </div>

              <div className="bg-[#1A1A1A]/50 backdrop-blur-xl rounded-[32px] p-16 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <div className="flex items-center justify-between gap-8">
                  {/* Intercell Logo */}
                  <div className="flex-1">
                    <img 
                      src="/images/partners/intercell.jpg" 
                      alt="Intercell" 
                      className="h-16 object-contain"
                    />
                  </div>

                  {/* Cova Santa Logo */}
                  <div className="flex-1">
                    <img 
                      src="/images/partners/cova-santa.jpg" 
                      alt="Cova Santa - The Place to Dream" 
                      className="h-16 object-contain"
                    />
                  </div>

                  {/* DGTL Logo */}
                  <div className="flex-1">
                    <img 
                      src="/images/partners/dgtl.jpg" 
                      alt="DGTL" 
                      className="h-16 object-contain"
                    />
                  </div>

                  {/* Amnesia Ibiza Logo */}
                  <div className="flex-1">
                    <img 
                      src="/images/partners/amnesia.jpg" 
                      alt="Amnesia Ibiza" 
                      className="h-16 object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ready Section with Sphere */}
        <div className="relative h-[90vh] md:h-screen w-full bg-black overflow-hidden">
          {/* Canvas Container */}
          <Canvas
            className="absolute inset-0"
            shadows
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 8], fov: 75 }}
          >
            <Suspense fallback={<Loader />}>
              <Environment preset="sunset" />
              <PerspectiveCamera makeDefault position={[0, 0, 8]} />
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} castShadow />
              <BottomFloatingShell />
            </Suspense>
          </Canvas>

          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 -mt-48 md:mt-0">
            <p className="text-gray-400 text-xs sm:text-base mb-3 mt-24 md:mt-0">are you ready?</p>
            <h2 className="text-white text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-6 max-w-3xl">
              BE A PART OF THE<br />
              NEXT BIG THING
            </h2>
            <button className="bg-[#F4A261] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full 
                             text-sm sm:text-base font-medium hover:bg-[#E76F51] transition-colors
                             hover:scale-105 active:scale-95 transform duration-200">
              GET STARTED
            </button>
          </div>
        </div>

        {/* Extra space at bottom - Update positioning for mobile */}
        <div className="relative h-[20px] md:h-[20px] -mt-12 md:mt-0">
          {/* Update Sonder logo positioning */}
          <div className="absolute bottom-1 md:bottom-8 left-4 md:left-8">
            <h2 className="text-xl md:text-2xl font-[500] text-white font-['Outfit'] tracking-[0.12em]">
              SONDER
            </h2>
          </div>

          {/* Update connect section positioning */}
          <div className="absolute bottom-1 md:bottom-8 right-4 md:right-8 text-right">
            <div className="hidden md:flex md:flex-col items-end">
              <h3 className="text-white text-xs md:text-sm font-bold tracking-[0.2em] mb-1">
                CLICK
              </h3>
              <h3 className="text-white text-xs md:text-sm font-bold tracking-[0.2em] mb-1">
                2
              </h3>
              <h3 className="text-white text-xs md:text-sm font-bold tracking-[0.2em] mb-4">
                CONNECT
              </h3>
            </div>
            <div className="flex gap-4 justify-end text-white/80">
              <a 
                href="https://tiktok.com/@sonder__ofc" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition-colors hover:text-white"
                aria-label="Follow us on TikTok"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 448 512">
                  <path fill="currentColor" d="M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z"/>
                </svg>
              </a>
              <a 
                href="https://www.instagram.com/sonder__ofc/?utm_source=ig_web_button_share_sheet" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="transition-colors hover:text-white"
                aria-label="Follow us on Instagram"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M7.8,2H16.2C19.4,2 22,4.6 22,7.8V16.2A5.8,5.8 0 0,1 16.2,22H7.8C4.6,22 2,19.4 2,16.2V7.8A5.8,5.8 0 0,1 7.8,2M7.6,4A3.6,3.6 0 0,0 4,7.6V16.4C4,18.39 5.61,20 7.6,20H16.4A3.6,3.6 0 0,0 20,16.4V7.6C20,5.61 18.39,4 16.4,4H7.6M17.25,5.5A1.25,1.25 0 0,1 18.5,6.75A1.25,1.25 0 0,1 17.25,8A1.25,1.25 0 0,1 16,6.75A1.25,1.25 0 0,1 17.25,5.5M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9Z" />
                </svg>
              </a>
              <a 
                href="mailto:info@sonder-official.com" 
                className="transition-colors hover:text-white"
                aria-label="Email us"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Sign In Button - temporarily hidden */}
      {showSignIn && (
        <div className="fixed top-8 right-8 z-50">
          <button className="bg-[#FF6B00] text-white px-12 py-2 rounded-full text-sm font-medium tracking-wider hover:bg-[#FF8533] transition-colors">
            SIGN IN
          </button>
        </div>
      )}
    </>
  );
};

export default AboutUs; 