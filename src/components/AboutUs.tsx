import React, { useState, Suspense, useRef } from "react";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Link } from 'react-router-dom';

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

// Add this new component for the bottom sphere
function BottomFloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} scale={[2.5, 2.5, 2.5]} castShadow>
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
            camera={{ position: [0, 0, 20], fov: 75 }}
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

              {/* Spectators Section */}
              <div className="mt-[20vh] max-w-5xl -ml-32 text-left">
                <h2 className="text-[2.5rem] md:text-[3.5rem] text-white/40 font-light leading-none mb-3">
                  We have become spectators<br />
                  of our own lives.
                </h2>
                <p className="text-lg md:text-xl text-white">
                  Capturing, but not living.
                </p>
              </div>

              {/* Centered Question Section */}
              <div className="mt-[20rem] text-center max-w-4xl mx-auto">
                <p className="text-white/40 text-base mb-3">
                  and let's face it
                </p>
                <h2 className="text-[1.75rem] md:text-[2.25rem] text-white font-bold tracking-wide leading-tight">
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
        <div className="max-w-4xl mx-auto text-right px-4 py-16">
          <p className="text-[1.5rem] md:text-[2rem] text-white/40 leading-tight">
            It's not just about capturing<br />
            memories; it's about <span className="text-white">giving</span><br />
            people the <span className="text-white">space to be present</span>,<br />
            knowing the memory will be<br />
            curated and stored for them.
          </p>
          <Link 
            to="/read-more" 
            className="inline-block mt-8 text-white text-lg border-b-2 border-white hover:text-white/80 transition-colors"
          >
            READ MORE
          </Link>
        </div>

        {/* Partner Section */}
        {showPartnerSection && (
          <div className="max-w-7xl mx-auto mt-32 px-4">
            <div className="backdrop-blur-xl bg-white/5 rounded-[2rem] p-16 border border-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              <div className="space-y-8 max-w-4xl">
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
        <div className="relative h-screen w-full bg-black overflow-hidden">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
            <p className="text-gray-400 text-base mb-3">are you ready?</p>
            <h2 className="text-white text-3xl md:text-5xl font-bold text-center mb-6 max-w-3xl">
              BE A PART OF THE<br />
              NEXT BIG THING
            </h2>
            <button className="bg-[#FF6B00] text-white px-10 py-3 rounded-full 
                             text-base font-medium hover:bg-[#FF8533] transition-colors
                             hover:scale-105 active:scale-95 transform duration-200">
              GET STARTED
            </button>
          </div>
        </div>

        {/* Follow Our Journey Section */}
        {showJourneySection && (
          <div className="relative w-full bg-black py-32">
            <div className="max-w-7xl mx-auto px-4">
              <div className="space-y-12">
                <div className="text-center">
                  <p className="text-gray-400 text-base mb-2">this is just the beginning</p>
                  <h2 className="text-white text-3xl md:text-5xl font-bold mb-12">
                    FOLLOW OUR JOURNEY
                  </h2>
                </div>

                <div className="flex items-start justify-between max-w-4xl mx-auto">
                  {/* Video Container */}
                  <div className="flex-1 mr-24">
                    <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden aspect-video w-full relative">
                      <video 
                        className="w-full h-full object-cover"
                        controls
                        playsInline
                      >
                        <source src="/videos/making-of-sonder.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-right self-end mb-1">
                    <h3 className="text-white text-4xl font-bold leading-tight">
                      THE<br />
                      MAKING<br />
                      OF<br />
                      SONDER
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extra space at bottom */}
        <div className="h-[600px]"></div>
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