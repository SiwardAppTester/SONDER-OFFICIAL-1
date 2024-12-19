import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';
import { Loader } from '../components/ThreeBackground';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';

// Bottom floating sphere component
function BottomFloatingShell() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[-2.5, 0, -2]} scale={[5.7, 5.7, 5.7]} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.85}
        roughness={0.15}
        envMapIntensity={0.95}
        transparent
        opacity={0.88}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// Add this new component near the top of the file, after BottomFloatingShell
function QuoteBottomSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -2]} scale={[3, 3, 3]} castShadow>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#1a1a1a"
        metalness={0.85}
        roughness={0.15}
        envMapIntensity={0.95}
        transparent
        opacity={0.88}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}

// Update the fadeInUp variant with an even longer duration
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

// Update the AnimatedText component with matching duration
function AnimatedText({ children, className, delay = 0 }) {
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

const ReadMore: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <style>
        {`
          /* Add font styles */
          h1, h2, h3, h4, h5, h6, p, button, a, span, div {
            font-family: 'Space Grotesk', sans-serif;
          }

          /* Remove the old scroll-container styles */

          /* Add these new scrollbar hiding styles */
          body {
            -ms-overflow-style: none !important;  /* IE and Edge */
            scrollbar-width: none !important;  /* Firefox */
            overflow-y: auto;
          }

          body::-webkit-scrollbar {
            display: none !important;  /* Chrome, Safari and Opera */
            width: 0 !important;
            background: transparent !important;
          }

          .content-wrapper {
            position: relative;
            z-index: 1;
            overflow-y: auto;
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }

          .content-wrapper::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            background: transparent !important;
          }

          .dark-gradient-overlay {
            background: linear-gradient(
              to right,
              transparent 0%,
              transparent 30%,
              rgba(0, 0, 0, 0.4) 70%,
              rgba(0, 0, 0, 0.6) 100%
            );
            pointer-events: none;
          }

          .top-blend-gradient {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.6) 40%,
              transparent 100%
            );
            height: 20vh;
            pointer-events: none;
          }

          .bottom-blend-gradient {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.6) 40%,
              transparent 100%
            );
            height: 30vh;
            pointer-events: none;
          }

          .top-sphere-blend {
            background: linear-gradient(
              to bottom,
              rgb(0, 0, 0) 0%,
              rgba(0, 0, 0, 0.8) 30%,
              transparent 100%
            );
            height: 40vh;
            pointer-events: none;
          }
        `}
      </style>
      
      <div className="relative w-full bg-black">
        {/* Background container */}
        <div className="fixed inset-0 bg-black">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/90" />
        </div>

        {/* Content wrapper */}
        <div className="content-wrapper">
          {/* First screen - Hero section */}
          <div className="min-h-[80vh] flex items-center justify-center p-4 pt-32">
            <div className="max-w-[90rem] text-center px-4 mt-64">
              <AnimatedText className="text-3xl md:text-5xl font-bold leading-relaxed tracking-wider text-white">
                THE JOY OF BEING FULLY PRESENT IS SLOWLY BEING REPLACED BY A NEED TO DOCUMENT EVERY MOMENT.
              </AnimatedText>
              
              {/* Increase margin for explore more section */}
              <div className="text-white/60 mt-72">
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
            </div>
          </div>

          {/* Second screen - Additional content */}
          <div className="min-h-[60vh] flex flex-col justify-center space-y-44 mt-32">
            <div className="max-w-3xl text-left px-4 ml-32">
              <AnimatedText className="text-lg md:text-2xl leading-relaxed text-white/80">
                We understand how easy it is to get caught<br />
                up in capturing memories instead of<br />
                experiencing them.
              </AnimatedText>
            </div>

            <div className="max-w-3xl text-right px-4 mr-32 self-end mb-8">
              <AnimatedText className="text-lg md:text-2xl leading-relaxed text-white/80" delay={0.2}>
                That's why we've created a platform<br />
                that ensures you never have to choose<br />
                between the two.
              </AnimatedText>
            </div>
          </div>

          {/* Ready Section with Sphere - Similar to AboutUs implementation */}
          <div className="relative h-screen w-full bg-black overflow-hidden mt-16">
            {/* Canvas Container */}
            <Canvas
              className="absolute inset-0"
              shadows
              gl={{ antialias: true, alpha: true }}
              camera={{ position: [0, 0, 3.3], fov: 45 }}
            >
              <Suspense fallback={<Loader />}>
                <Environment preset="sunset" />
                <PerspectiveCamera makeDefault position={[0, 0, 3.3]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <BottomFloatingShell />
              </Suspense>
            </Canvas>

            {/* Top blending gradient */}
            <div className="absolute top-0 left-0 right-0 top-blend-gradient z-10" />
            
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 dark-gradient-overlay z-10" />

            {/* Text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-32 z-20 px-4">
              <AnimatedText className="text-3xl md:text-4xl font-bold text-white mb-4">
                BUT, WHO ARE WE?
              </AnimatedText>
              <AnimatedText className="text-xl md:text-2xl text-white/90 max-w-4xl text-center leading-relaxed" delay={0.2}>
                We are three friends brought together by our shared love for festivals and events. 
                Over the years, we've traveled the world, experiencing countless events together, 
                and noticed a growing shift in how people engage with festivals.
              </AnimatedText>
            </div>
          </div>

          {/* Add this section after the sphere section, inside the content container */}
          <div className="relative min-h-[120vh] w-full bg-black pt-96">
            <div className="max-w-7xl mx-auto px-4 md:px-64">
              <div className="flex flex-col md:flex-row items-start">
                {/* Left title section */}
                <div className="md:w-[15%] pr-0 -mt-48">
                  <AnimatedText className="text-4xl md:text-5xl font-bold text-white leading-none mb-0">
                    The<br />
                    Good<br />
                    Old<br />
                    Days?
                  </AnimatedText>
                </div>

                {/* Right content section */}
                <div className="md:w-[85%] md:pl-24 -mt-8 mb-32">
                  <AnimatedText className="text-xl md:text-2xl text-white/80 leading-relaxed" delay={0.2}>
                    The debate around whether phones belong on the dance floor has become a hot topic, 
                    with some events experimenting with concepts like no-phone policies or camera stickers. 
                    While these ideas spark conversations and hint at a desire to return to the "good old days," 
                    they don't fully address the reality of our digital age. At the same time, we recognize 
                    the incredible value that phones and user-generated content bring to the growth of events 
                    and artists.
                  </AnimatedText>
                </div>
              </div>
            </div>
          </div>

          {/* Add this section at the very bottom of the content container */}
          <div className="relative h-screen w-full bg-black overflow-hidden">
            {/* Canvas Container with bottom sphere */}
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
                <mesh position={[0, 4, 0]} scale={[5, 5, 5]} castShadow>
                  <sphereGeometry args={[1, 32, 32]} />
                  <meshStandardMaterial
                    color="#1a1a1a"
                    metalness={0.85}
                    roughness={0.15}
                    envMapIntensity={0.8}
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    emissive="#000044"
                    emissiveIntensity={0.15}
                  />
                </mesh>
              </Suspense>
            </Canvas>

            {/* Full section blur overlay */}
            <div className="absolute inset-0 backdrop-blur-md z-[11]" />

            {/* Top blending gradient */}
            <div className="absolute top-0 left-0 right-0 top-sphere-blend z-[12]" />

            {/* Text overlay */}
            <div className="absolute inset-0 flex flex-col items-center -mt-24 z-[13]">
              <AnimatedText className="text-[10rem] md:text-[18rem] font-[500] text-white mb-0 w-full text-center font-['Outfit'] tracking-[0.12em]">
                SONDER
              </AnimatedText>
              <AnimatedText className="text-3xl md:text-5xl text-white/90 max-w-7xl text-center leading-relaxed -mt-8" delay={0.2}>
                RATHER THAN RESISTING TECHNOLOGY, WE<br />
                BELIEVE IN UTILIZING IT TO ENHANCE OUR LIVES.
              </AnimatedText>
            </div>
          </div>

          {/* Update the bottom black section - remove blue tint */}
          <div className="relative h-screen w-full bg-black">
            {/* Remove the blue gradient and just use black gradient for smooth transition */}
            <div className="absolute inset-0" style={{ 
              background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 30%)' 
            }} />
          </div>

          {/* Add the "BUT, WHAT ARE WE?" section with minimal padding */}
          <div className="relative h-screen w-full bg-black pl-32 pr-8 -mt-[65rem] z-[14]">
            <AnimatedText className="text-2xl md:text-3xl font-bold text-white mb-8">
              BUT, WHAT ARE WE?
            </AnimatedText>
            
            <div className="space-y-16 max-w-md">
              <AnimatedText className="text-base md:text-xl text-white/80 leading-relaxed" delay={0.2}>
                SONDER is a platform that lets you be present in the moment, knowing we'll 
                provide you with all the curated content you need. By giving festival-goers 
                the freedom to immerse themselves fully, we aim to restore the true festival 
                experience while also supporting events with strategic tools for categorizing, 
                uploading, and optimizing content for their marketing campaigns. We bridge 
                the gap between event experiences and content sharing.
              </AnimatedText>

              <AnimatedText className="text-base md:text-xl text-white/80 leading-relaxed" delay={0.4}>
                By combining innovative technology with a people-first approach, we help 
                event-goers enjoy every second while guaranteeing access to exclusive, 
                high-quality content linked directly to their tickets. From VIP backstage 
                moments to general access highlights, our mission is to deliver memories that 
                are curated, effortless, and unforgettable.
              </AnimatedText>
            </div>
          </div>

          {/* Add the quote section after the "BUT, WHAT ARE WE?" section */}
          <div className="relative h-screen w-full bg-black z-[14] pt-32">
            <div className="max-w-7xl mx-auto px-8">
              <AnimatedText className="text-3xl md:text-4xl leading-relaxed text-center">
                <span className="text-white/30">"we redefine the way people engage with events, creating a seamless experience </span>
                <span className="text-white">where technology complements, rather than distracts from, the actual moment. </span>
                <span className="text-white/30">changing from the moments you have missed to moments you lived."</span>
              </AnimatedText>
            </div>
          </div>

          {/* Update the final black section to include the sphere */}
          <div className="relative h-screen w-full bg-black z-[14] -mt-[30rem]">
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
                <QuoteBottomSphere />
              </Suspense>
            </Canvas>

            {/* Add text and button overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <AnimatedText className="text-gray-400 text-lg mb-2">
                are you ready?
              </AnimatedText>
              <AnimatedText className="text-4xl md:text-5xl font-bold text-white mb-8 text-center" delay={0.2}>
                BE A PART OF THE<br />
                NEXT BIG THING
              </AnimatedText>
              <AnimatedText delay={0.4}>
                <button className="px-8 py-3 bg-[#F4A261] text-white rounded-full font-medium hover:bg-[#E76F51] transition-colors">
                  GET STARTED
                </button>
              </AnimatedText>
            </div>

            {/* Add gradients for smooth blending */}
            <div className="absolute top-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to bottom, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
            <div className="absolute bottom-0 left-0 right-0 h-32" style={{ 
              background: 'linear-gradient(to top, rgb(0, 0, 0) 0%, transparent 100%)' 
            }} />
          </div>

          {/* Add extra black section for extended background */}
          <div className="relative h-[6vh] w-full bg-black z-[14]">
            {/* Add Sonder logo in bottom left */}
            <div className="absolute bottom-8 left-8">
              <h2 className="text-2xl font-[500] text-white font-['Outfit'] tracking-[0.12em]">
                SONDER
              </h2>
            </div>

            {/* Add connect section in bottom right */}
            <div className="absolute bottom-8 right-8 text-right">
              <div className="flex flex-col items-end">
                <h3 className="text-white text-sm font-bold tracking-[0.2em] mb-1">
                  CLICK
                </h3>
                <h3 className="text-white text-sm font-bold tracking-[0.2em] mb-1">
                  2
                </h3>
                <h3 className="text-white text-sm font-bold tracking-[0.2em] mb-4">
                  CONNECT
                </h3>
              </div>
              <div className="flex gap-4 justify-end text-white/80 font-bold">
                <a href="mailto:info@sonder-official.com" className="transition-colors hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                </a>
                <a href="https://instagram.com/sonder__ofc" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 2c-2.714 0-3.055.013-4.122.06-1.064.049-1.791.218-2.427.465a4.901 4.901 0 00-1.772 1.153A4.902 4.902 0 002.525 5.45c-.247.636-.416 1.363-.465 2.427C2.013 8.944 2 9.285 2 12s.013 3.056.06 4.122c.049 1.064.218 1.791.465 2.427a4.902 4.902 0 001.153 1.772 4.902 4.902 0 001.772 1.153c.636.247 1.363.416 2.427.465 1.067.047 1.408.06 4.122.06s3.055-.013 4.122-.06c1.064-.049 1.791-.218 2.427-.465a4.902 4.902 0 001.772-1.153 4.902 4.902 0 001.153-1.772c.247-.636.416-1.363.465-2.427.047-1.066.06-1.407.06-4.122s-.013-3.056-.06-4.122c-.049-1.064-.218-1.791-.465-2.427a4.902 4.902 0 00-1.153-1.772 4.901 4.901 0 00-1.772-1.153c-.636-.247-1.363-.416-2.427-.465C15.056 2.013 14.715 2 12 2zm0 1.802c2.67 0 2.986.01 4.04.058.975.045 1.505.207 1.858.344.466.182.8.399 1.15.748.35.35.566.684.748 1.15.137.353.3.883.344 1.857.048 1.055.058 1.37.058 4.041 0 2.67-.01 2.986-.058 4.04-.045.975-.207 1.505-.344 1.858a3.09 3.09 0 01-.748 1.15c-.35.35-.684.566-1.15.748-.353.137-.883.3-1.857.344-1.054.048-1.37.058-4.041.058-2.67 0-2.987-.01-4.04-.058-.975-.045-1.505-.207-1.858-.344a3.098 3.098 0 01-1.15-.748 3.098 3.098 0 01-.748-1.15c-.137-.353-.3-.883-.344-1.857-.048-1.055-.058-1.37-.058-4.041 0-2.67.01-2.986.058-4.04.045-.975.207-1.505.344-1.858.182-.466.399-.8.748-1.15.35-.35.684-.566 1.15-.748.353-.137.883-.3 1.857-.344 1.055-.048 1.37-.058 4.041-.058z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M12 15.333a3.333 3.333 0 110-6.666 3.333 3.333 0 010 6.666zm0-8.468a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27z" clipRule="evenodd" />
                    <circle cx="17.338" cy="6.662" r="1.2" />
                  </svg>
                </a>
                <a href="https://tiktok.com/@sonder__ofc" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0011.14-4.02v-7a8.16 8.16 0 004.65 1.49v-3.88a4.85 4.85 0 01-1.2 0z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default ReadMore; 