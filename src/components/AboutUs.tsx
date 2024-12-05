import React, { Suspense, useEffect } from "react";
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, useProgress, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate, useLocation } from 'react-router-dom';
import gsap from 'gsap';

// Loader component (same as SignIn)
function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="text-white text-xl">
        {progress.toFixed(0)}% loaded
      </div>
    </Html>
  )
}

// InnerSphere component (same as SignIn)
function InnerSphere() {
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
  )
}

const AboutUs: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTransitioning = location.state?.transitioning;
  const [isTransitioningBack, setIsTransitioningBack] = React.useState(false);

  useEffect(() => {
    if (isTransitioning) {
      // Fade in animation when component mounts
      gsap.fromTo('.about-content', 
        { opacity: 0, y: '5%' },
        { 
          opacity: 1, 
          y: '0%',
          duration: 0.6,
          ease: "power2.out",
          delay: 0.1
        }
      );
      window.history.replaceState({}, document.title);
    }
  }, [isTransitioning]);

  const handleBackClick = () => {
    setIsTransitioningBack(true);
    
    // Animate content with fade out and slide
    gsap.to('.about-content', {
      y: '100%',
      duration: 0.6,
      ease: "power2.inOut"
    });

    // Fade out slightly faster than slide
    gsap.to('.about-content', {
      opacity: 0,
      duration: 0.4,
      ease: "power2.inOut"
    });

    // Navigate after animation
    setTimeout(() => {
      navigate('/', { state: { transitioningFromAbout: true } });
    }, 600);
  };

  return (
    <div className={`relative h-screen w-full overflow-hidden transform transition-transform duration-600 
                    ${isTransitioning ? 'translate-y-0' : 'translate-y-full'}
                    ${isTransitioningBack ? 'translate-y-full' : 'translate-y-0'}`}>
      {/* Three.js Background */}
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

      {/* Content Section */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center items-center about-content"
           style={{ opacity: isTransitioning ? 0 : 1 }}>
        <div className="w-full max-w-5xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 
                     backdrop-blur-xl bg-white/10 rounded-lg 
                     border border-white/20 text-white/90
                     hover:bg-white/20 transition-all duration-300
                     font-['Space_Grotesk'] tracking-wider"
          >
            ↑ Back
          </button>

          {/* Updated About Us Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Main Content */}
            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 border border-white/10
                          hover:bg-white/10 transition-all duration-500">
              <h2 className="text-4xl font-['Space_Grotesk'] tracking-[0.15em] mb-6 text-white/90
                           bg-gradient-to-r from-white/90 to-white/70 bg-clip-text text-transparent">
                About Us
              </h2>
              
              <p className="text-lg text-white/80 font-['Space_Grotesk'] leading-relaxed mb-6">
                Sonder is more than just a platform – it's a celebration of life's meaningful moments and the connections that make them special.
              </p>

              <p className="text-lg text-white/70 font-['Space_Grotesk'] leading-relaxed">
                Our mission is to bridge the gap between event organizers and attendees, creating a seamless space where memories are made and communities are built.
              </p>
            </div>

            {/* Right Column - Features */}
            <div className="space-y-4">
              {[
                {
                  title: "Discovery",
                  description: "Personalized event discovery powered by advanced algorithms"
                },
                {
                  title: "Integration",
                  description: "Seamless integration between personal and business accounts"
                },
                {
                  title: "Engagement",
                  description: "Real-time engagement features that bring communities together"
                }
              ].map((feature, index) => (
                <div key={index} 
                     className="backdrop-blur-xl bg-white/5 rounded-xl p-6 border border-white/10
                                hover:bg-white/10 transition-all duration-300 transform hover:scale-[1.02]">
                  <h3 className="text-xl text-white/90 font-['Space_Grotesk'] tracking-wide mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 font-['Space_Grotesk']">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="inline-block text-lg text-white/60 font-['Space_Grotesk'] tracking-wider
                         hover:text-white/90 transition-colors duration-300 
                         border-b border-white/0 hover:border-white/20 pb-1">
              Experience the moment. Cherish forever.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs; 